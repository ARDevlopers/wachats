/* ============================================================
   ChatLens Media Mapper
   Maps media, documents (PDF, Excel, Word, PPT, APK, ZIP, vCard),
   videos, and voice notes from ZIP to chat messages.
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.MediaMapper = {
    /**
     * Map extracted media files to corresponding messages
     * @param {Array} messages - Parsed messages
     * @param {Array} mediaFiles - Extracted media objects
     * @returns {Array} Updated messages
     */
    mapMediaToMessages(messages, mediaFiles) {
      if (!mediaFiles || mediaFiles.length === 0) return messages;

      // Build lookup index by filename (case-insensitive and without ext)
      const mediaByName = new Map();
      for (const media of mediaFiles) {
        const baseName = media.name.toLowerCase();
        mediaByName.set(baseName, media);

        const nameNoExt = baseName.replace(/\.[^.]+$/, '');
        if (!mediaByName.has(nameNoExt)) {
          mediaByName.set(nameNoExt, media);
        }
      }

      const unmappedMedia = [...mediaFiles];

      // First pass: exact and pattern matching
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (!msg.hasMedia && !msg.attachmentName) continue;

        let matchedFile = null;

        // Check explicit attachment filename match
        if (msg.attachmentName) {
          const target = msg.attachmentName.toLowerCase();
          if (mediaByName.has(target)) {
            matchedFile = mediaByName.get(target);
          }
        }

        // Try extracting filename from message text
        if (!matchedFile && msg.text) {
          const match = msg.text.match(WCA.Constants.REGEX.ATTACHMENT);
          if (match) {
            const target = match[1].toLowerCase();
            if (mediaByName.has(target)) matchedFile = mediaByName.get(target);
          }
        }

        // Try timestamp matching for standard WhatsApp media naming (e.g. IMG-20240513-WA0005.jpg)
        if (!matchedFile && msg.timestamp) {
          const dateStr = this._formatDateForFilename(msg.timestamp);
          const prefixes = ['IMG', 'VID', 'AUD', 'DOC', 'PTT', 'STK'];
          for (const prefix of prefixes) {
            const pattern = `${prefix}-${dateStr}-WA`.toLowerCase();
            for (const [name, media] of mediaByName) {
              if (name.startsWith(pattern) && unmappedMedia.includes(media)) {
                matchedFile = media;
                break;
              }
            }
            if (matchedFile) break;
          }
        }

        if (matchedFile) {
          msg.mediaFile = matchedFile;
          msg.mediaCategory = matchedFile.category;
          matchedFile.messageIndex = i;
          matchedFile.sender = msg.sender;
          matchedFile.timestamp = msg.timestamp;

          const idx = unmappedMedia.indexOf(matchedFile);
          if (idx !== -1) unmappedMedia.splice(idx, 1);
        } else {
          msg.mediaCategory = this._guessMediaCategory(msg.text || '');
        }
      }

      // Second pass: link remaining unmapped media sequentially to <Media omitted> messages
      let unmappedIdx = 0;
      for (let i = 0; i < messages.length && unmappedIdx < unmappedMedia.length; i++) {
        const msg = messages[i];
        if (msg.hasMedia && !msg.mediaFile) {
          const file = unmappedMedia[unmappedIdx++];
          msg.mediaFile = file;
          msg.mediaCategory = file.category;
          file.messageIndex = i;
          file.sender = msg.sender;
          file.timestamp = msg.timestamp;
        }
      }

      return messages;
    },

    _formatDateForFilename(date) {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const d = date.getDate().toString().padStart(2, '0');
      return `${y}${m}${d}`;
    },

    _guessMediaCategory(text) {
      if (!text) return 'other';
      const lower = text.toLowerCase();
      if (/\.(jpg|png|webp|gif|heic)/i.test(lower) || lower.includes('image omitted') || lower.includes('photo')) return 'images';
      if (/\.(mp4|mov|mkv|3gp)/i.test(lower) || lower.includes('video omitted')) return 'videos';
      if (/\.(opus|ogg|mp3|m4a|aac|wav)/i.test(lower) || lower.includes('audio omitted') || lower.includes('voice message')) return 'audio';
      if (/\.pdf/i.test(lower)) return 'pdf';
      if (/\.(xlsx|xls|csv)/i.test(lower)) return 'excel';
      if (/\.(docx?|rtf)/i.test(lower)) return 'word';
      if (/\.(pptx?)/i.test(lower)) return 'ppt';
      if (/\.apk/i.test(lower)) return 'apk';
      if (/\.zip|\.rar/i.test(lower)) return 'zip';
      if (/\.vcf|vcard/i.test(lower)) return 'contacts';
      return 'other';
    },

    cleanup(mediaFiles) {
      if (!mediaFiles) return;
      for (const file of mediaFiles) {
        if (file.url) {
          URL.revokeObjectURL(file.url);
          file.url = null;
        }
      }
    }
  };
})();
