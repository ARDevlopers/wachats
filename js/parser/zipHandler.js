/* ============================================================
   ChatLens ZIP Handler
   JSZip integration for extracting WhatsApp export archives
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.ZipHandler = {
    /**
     * Extract a WhatsApp chat ZIP file
     * @param {File} file - The ZIP file
     * @param {function} onProgress - Progress callback (percent, status)
     * @returns {Promise<{chatText: string, mediaFiles: Array}>}
     */
    async extract(file, onProgress) {
      if (typeof JSZip === 'undefined') {
        throw new Error('JSZip library not loaded');
      }

      onProgress?.(5, 'Reading ZIP file...');

      const zip = await JSZip.loadAsync(file);
      const entries = Object.keys(zip.files);

      onProgress?.(15, 'Scanning for chat file...');

      // Find the main chat TXT file
      let chatText = null;
      let chatFileName = null;

      for (const path of entries) {
        const name = path.split('/').pop();
        if (!name) continue;

        // Match WhatsApp chat file patterns
        if (WCA.Constants.REGEX.CHAT_FILE.test(name) ||
            name === '_chat.txt' ||
            name.endsWith('.txt') && !zip.files[path].dir) {

          // Prefer "WhatsApp Chat with" pattern
          if (WCA.Constants.REGEX.CHAT_FILE.test(name) || !chatText) {
            const content = await zip.files[path].async('text');
            // Verify it's actually a chat file (has timestamp patterns)
            if (this._looksLikeChatFile(content)) {
              chatText = content;
              chatFileName = name;

              if (WCA.Constants.REGEX.CHAT_FILE.test(name)) break; // Found the ideal match
            }
          }
        }
      }

      if (!chatText) {
        // Fallback: try ALL txt files
        for (const path of entries) {
          if (!path.endsWith('.txt') || zip.files[path].dir) continue;
          const content = await zip.files[path].async('text');
          if (this._looksLikeChatFile(content)) {
            chatText = content;
            chatFileName = path.split('/').pop();
            break;
          }
        }
      }

      if (!chatText) {
        throw new Error('No chat file found in the ZIP archive');
      }

      onProgress?.(30, 'Extracting media files...');

      // Extract media files
      const mediaFiles = [];
      const mediaEntries = entries.filter(path => {
        if (zip.files[path].dir) return false;
        const name = path.split('/').pop().toLowerCase();
        if (name === chatFileName?.toLowerCase()) return false;
        const ext = name.split('.').pop();
        return this._isMediaFile(ext);
      });

      for (let i = 0; i < mediaEntries.length; i++) {
        const path = mediaEntries[i];
        const name = path.split('/').pop();
        const ext = name.split('.').pop().toLowerCase();
        const category = this._categorizeFile(ext);

        try {
          const blob = await zip.files[path].async('blob');
          const url = URL.createObjectURL(blob);
          const size = blob.size;

          mediaFiles.push({
            name,
            path,
            ext,
            category,
            size,
            blob,
            url,
            messageIndex: -1 // Will be mapped later
          });
        } catch (err) {
          console.warn(`Failed to extract: ${path}`, err);
        }

        // Progress
        const progress = 30 + Math.round((i / mediaEntries.length) * 50);
        onProgress?.(progress, `Extracting media (${i + 1}/${mediaEntries.length})...`);
      }

      onProgress?.(85, 'Processing complete');

      return { chatText, mediaFiles, chatFileName };
    },

    /**
     * Handle a plain text file upload
     * @param {File} file
     * @returns {Promise<{chatText: string, mediaFiles: Array}>}
     */
    async readTextFile(file) {
      const chatText = await file.text();
      if (!this._looksLikeChatFile(chatText)) {
        throw new Error('This does not appear to be a WhatsApp chat export');
      }
      return { chatText, mediaFiles: [], chatFileName: file.name };
    },

    /**
     * Handle folder upload (multiple files)
     * @param {FileList} files
     * @param {function} onProgress
     * @returns {Promise<{chatText: string, mediaFiles: Array}>}
     */
    async readFolder(files, onProgress) {
      let chatText = null;
      let chatFileName = null;
      const mediaFiles = [];

      onProgress?.(10, 'Scanning folder...');

      // First pass: find chat file
      for (const file of files) {
        if (file.name.endsWith('.txt')) {
          const content = await file.text();
          if (this._looksLikeChatFile(content)) {
            chatText = content;
            chatFileName = file.name;
            break;
          }
        }
      }

      if (!chatText) {
        throw new Error('No chat file found in the folder');
      }

      onProgress?.(30, 'Processing media files...');

      // Second pass: collect media files
      const mediaEntries = [...files].filter(f => {
        if (f.name === chatFileName) return false;
        const ext = f.name.split('.').pop().toLowerCase();
        return this._isMediaFile(ext);
      });

      for (let i = 0; i < mediaEntries.length; i++) {
        const file = mediaEntries[i];
        const ext = file.name.split('.').pop().toLowerCase();
        const category = this._categorizeFile(ext);
        const url = URL.createObjectURL(file);

        mediaFiles.push({
          name: file.name,
          path: file.webkitRelativePath || file.name,
          ext,
          category,
          size: file.size,
          blob: file,
          url,
          messageIndex: -1
        });

        const progress = 30 + Math.round((i / mediaEntries.length) * 50);
        onProgress?.(progress, `Processing media (${i + 1}/${mediaEntries.length})...`);
      }

      onProgress?.(85, 'Processing complete');

      return { chatText, mediaFiles, chatFileName };
    },

    /**
     * Check if text content looks like a WhatsApp chat
     */
    _looksLikeChatFile(text) {
      if (!text || text.length < 50) return false;
      const lines = text.split('\n').slice(0, 10);
      let matchCount = 0;
      for (const line of lines) {
        if (WCA.Constants.REGEX.MESSAGE_LINE.test(line.replace(/\u200E/g, ''))) {
          matchCount++;
        }
      }
      return matchCount >= 2;
    },

    /**
     * Check if file extension is a media type
     */
    _isMediaFile(ext) {
      ext = ext.toLowerCase();
      for (const category of Object.values(WCA.Constants.FILE_TYPES)) {
        if (category.includes(ext)) return true;
      }
      return false;
    },

    /**
     * Categorize file by extension
     */
    _categorizeFile(ext) {
      ext = ext.toLowerCase();
      for (const [category, extensions] of Object.entries(WCA.Constants.FILE_TYPES)) {
        if (extensions.includes(ext)) return category;
      }
      return 'other';
    }
  };
})();
