/* ============================================================
   ChatLens WhatsApp Chat Parser
   Multi-format parser with auto-detection, comprehensive message
   tagging, multi-line support, empty message tolerance,
   and language identification (Gujarati, Hindi, English, Mixed).
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.ChatParser = {
    /**
     * Parse WhatsApp chat text into structured messages
     * @param {string} text - Raw chat file content
     * @param {object} options - { dateFormat, onProgress }
     * @returns {Promise<{messages: Array, senders: string[], chatName: string, stats: object}>}
     */
    async parse(text, options = {}) {
      if (!text) return { messages: [], senders: [], chatName: 'Empty Chat', dateFormat: 'DMY' };

      const lines = text.split('\n');
      const totalLines = lines.length;

      // Auto-detect format if not specified
      let dateFormat = options.dateFormat;
      if (!dateFormat || dateFormat === 'auto') {
        dateFormat = this.detectDateFormat(lines);
      }

      if (!dateFormat) {
        dateFormat = 'DMY'; // Default fallback instead of crashing
      }

      const messages = [];
      const senderSet = new Set();
      let currentMsg = null;
      let chatName = '';
      const CHUNK_SIZE = WCA.Constants.PARSER.CHUNK_SIZE;

      for (let i = 0; i < totalLines; i++) {
        const line = lines[i];

        // Try to parse line as a new message timestamp line
        const parsed = this._parseLine(line, dateFormat);

        if (parsed) {
          // Finalize previous message
          if (currentMsg) {
            this._finalizeMessage(currentMsg);
            messages.push(currentMsg);
          }
          currentMsg = parsed;

          if (parsed.sender && !parsed.isSystem) {
            senderSet.add(parsed.sender);
          }
        } else if (currentMsg) {
          // Continuation of multi-line message
          currentMsg.text = (currentMsg.text !== undefined ? currentMsg.text : '') + '\n' + line;
          currentMsg.isMultiLine = true;
        }

        // Progress update
        if (options.onProgress && i % CHUNK_SIZE === 0) {
          options.onProgress(Math.round((i / totalLines) * 100), i, totalLines);
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      // Don't forget the last message
      if (currentMsg) {
        this._finalizeMessage(currentMsg);
        messages.push(currentMsg);
      }

      // Post-process message indexes and global chat name
      for (let i = 0; i < messages.length; i++) {
        messages[i].index = i;
      }

      chatName = this._extractChatName(messages);

      if (options.onProgress) {
        options.onProgress(100, totalLines, totalLines);
      }

      return {
        messages,
        senders: [...senderSet],
        chatName,
        dateFormat
      };
    },

    /**
     * Parse a single line into a message object or null
     */
    _parseLine(line, dateFormat) {
      if (!line) return null;

      // Clean BOM and invisible direction mark unicode characters
      const cleanLine = line.replace(/^\uFEFF/, '').replace(/[\u200E\u200F\u202E\u202F]/g, ' ').trim();
      if (!cleanLine) return null;

      // Match timestamp pattern
      const msgMatch = cleanLine.match(WCA.Constants.REGEX.MESSAGE_LINE);
      if (!msgMatch) return null;

      const dateStr = msgMatch[1];
      const timeStr = msgMatch[2];

      const timestamp = WCA.DateUtils.parseDateTime(dateStr, timeStr, dateFormat);
      if (!timestamp) return null;

      // Extract rest of line after timestamp
      const rest = cleanLine.substring(msgMatch[0].length);

      // Check if it has a sender (e.g. "Name: message text")
      const senderMatch = rest.match(WCA.Constants.REGEX.SENDER_MSG);

      if (senderMatch) {
        return {
          timestamp,
          sender: senderMatch[1].trim(),
          text: senderMatch[2], // Can be empty string (supported requirement)
          isSystem: false,
          tags: ['text'],
          index: 0
        };
      } else {
        // System message (e.g., "Messages and calls are end-to-end encrypted")
        return {
          timestamp,
          sender: null,
          text: rest.trim(),
          isSystem: true,
          tags: ['system'],
          index: 0
        };
      }
    },

    /**
     * Finalize message classification, tagging, and feature extraction
     */
    _finalizeMessage(msg) {
      const tags = new Set(msg.tags || []);
      const text = msg.text || '';

      // 1. Empty message tag
      if (!text && !msg.isSystem) {
        tags.add('empty');
      }

      // 2. Multi-line tag
      if (msg.isMultiLine) {
        tags.add('multiline');
      }

      // 3. System message
      if (msg.isSystem) {
        tags.add('system');
        msg.tags = [...tags];
        return;
      }

      // 4. Deleted messages
      if (WCA.Constants.REGEX.DELETED_MSG.test(text)) {
        msg.isDeleted = true;
        tags.add('deleted');
      }

      // 5. Edited & Forwarded
      if (WCA.Constants.REGEX.EDITED_MSG.test(text)) {
        msg.isEdited = true;
        text.replace(/\s*\(edited\)\s*$/i, '');
      }
      if (WCA.Constants.REGEX.FORWARDED_MSG.test(text)) {
        msg.isForwarded = true;
      }

      // 6. Media Omitted
      if (WCA.Constants.REGEX.MEDIA_OMITTED.test(text)) {
        msg.hasMedia = true;
        msg.isOmitted = true;
        tags.add('omitted-media');
        tags.add('attachment');
      }

      // 7. Explicit file attachment text matching (e.g. IMG-20240513-WA0005.jpg (file attached))
      const attachMatch = text.match(WCA.Constants.REGEX.ATTACHMENT);
      if (attachMatch) {
        msg.hasMedia = true;
        msg.attachmentName = attachMatch[1];
        tags.add('attachment');
        this._tagByExtension(attachMatch[1], tags);
      }

      // 8. Contact card (.vcf or contact info)
      if (/\.vcf\b|BEGIN:VCARD/i.test(text) || /contact card omitted/i.test(text)) {
        msg.isContact = true;
        tags.add('contact');
      }

      // 9. Location & Coordinates
      if (WCA.Constants.REGEX.LIVE_LOCATION.test(text)) {
        msg.isLiveLocation = true;
        tags.add('live-location');
        tags.add('location');
      } else if (WCA.Constants.REGEX.COORDINATES.test(text.trim())) {
        msg.isCoordinates = true;
        msg.coordinates = text.trim();
        tags.add('location');
      }

      // 10. URL extraction and domain classification
      const urls = text.match(WCA.Constants.REGEX.URL);
      if (urls && urls.length > 0) {
        msg.links = urls;
        tags.add('link');
      } else {
        msg.links = [];
      }

      // 11. Phone numbers
      const phones = text.match(WCA.Constants.REGEX.PHONE);
      if (phones && phones.length > 0 && !msg.isCoordinates) {
        msg.phones = phones;
        tags.add('phone');
      }

      // 12. Email addresses
      const emails = text.match(WCA.Constants.REGEX.EMAIL);
      if (emails && emails.length > 0) {
        msg.emails = emails;
        tags.add('email');
      }

      // 13. OTP codes
      if (WCA.Constants.REGEX.OTP.test(text.trim())) {
        msg.isOTP = true;
        tags.add('otp');
      }

      // 14. Password-like / Sensitive Data
      if (WCA.Constants.REGEX.SENSITIVE.test(text.trim())) {
        msg.isSensitive = true;
        tags.add('sensitive');
      }

      // 15. Emojis
      if (text) {
        msg.isEmojiOnly = WCA.EmojiUtils.isEmojiOnly(text);
        if (msg.isEmojiOnly) tags.add('emoji');
      }

      // 16. Language detection (Gujarati, Hindi, English, Mixed)
      msg.language = this._detectLanguage(text);

      msg.tags = [...tags];
    },

    /**
     * Categorize file extension into tags
     */
    _tagByExtension(filename, tags) {
      const ext = filename.split('.').pop().toLowerCase();

      for (const [category, extList] of Object.entries(WCA.Constants.FILE_TYPES)) {
        if (extList.includes(ext)) {
          switch (category) {
            case 'images': tags.add('image'); break;
            case 'videos': tags.add('video'); break;
            case 'audio': tags.add('audio'); break;
            case 'pdf': tags.add('pdf'); tags.add('document'); break;
            case 'excel': tags.add('excel'); tags.add('document'); break;
            case 'word': tags.add('word'); tags.add('document'); break;
            case 'ppt': tags.add('ppt'); tags.add('document'); break;
            case 'apk': tags.add('apk'); break;
            case 'zip': tags.add('zip'); break;
            case 'contacts': tags.add('contact'); break;
          }
        }
      }
    },

    /**
     * Detect language of message text
     */
    _detectLanguage(text) {
      if (!text) return 'none';
      const hasGuj = WCA.Constants.REGEX.GUJARATI.test(text);
      const hasHin = WCA.Constants.REGEX.HINDI.test(text);
      const hasEng = WCA.Constants.REGEX.ENGLISH.test(text);

      const count = (hasGuj ? 1 : 0) + (hasHin ? 1 : 0) + (hasEng ? 1 : 0);
      if (count > 1) return 'Mixed';
      if (hasGuj) return 'Gujarati';
      if (hasHin) return 'Hindi';
      if (hasEng) return 'English';
      return 'Other';
    },

    /**
     * Auto-detect date format from lines
     */
    detectDateFormat(lines) {
      const samples = [];
      for (let i = 0; i < Math.min(lines.length, WCA.Constants.PARSER.AUTO_DETECT_LINES); i++) {
        const line = lines[i].replace(/^\uFEFF/, '').replace(/[\u200E\u200F]/g, ' ').trim();
        const match = line.match(WCA.Constants.REGEX.MESSAGE_LINE);
        if (match) samples.push(match[1]);
      }

      if (samples.length === 0) return 'DMY';

      let couldBeDMY = true;
      let couldBeMDY = true;

      for (const dateStr of samples) {
        const parts = dateStr.split(/[\/\-\.]/);
        if (parts.length !== 3) continue;

        if (parts[0].length === 4) return 'YMD';

        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);

        if (p0 > 12) couldBeMDY = false;
        if (p1 > 12) couldBeDMY = false;
      }

      if (couldBeDMY && !couldBeMDY) return 'DMY';
      if (couldBeMDY && !couldBeDMY) return 'MDY';
      return 'DMY';
    },

    /**
     * Extract chat name from system messages or senders
     */
    _extractChatName(messages) {
      for (const msg of messages) {
        if (msg.isSystem && msg.text) {
          const groupMatch = msg.text.match(/created group "(.+)"/i);
          if (groupMatch) return groupMatch[1];
        }
      }

      const senders = new Set();
      for (const msg of messages) {
        if (msg.sender) senders.add(msg.sender);
        if (senders.size >= 2) break;
      }

      if (senders.size === 1) return [...senders][0];
      if (senders.size === 2) return [...senders].join(' & ');
      if (senders.size > 2) return `Group (${senders.size} members)`;

      return 'WhatsApp Export';
    },

    /**
     * Get preview lines for format modal
     */
    getPreviewLines(text) {
      const lines = text.split('\n');
      const previews = [];
      for (let i = 0; i < lines.length && previews.length < 5; i++) {
        const line = lines[i].trim();
        if (line && line.match(WCA.Constants.REGEX.MESSAGE_LINE)) {
          previews.push(line);
        }
      }
      return previews;
    }
  };
})();
