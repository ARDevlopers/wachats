/* ============================================================
   ChatLens Upload View
   Drag & drop, file input, progress, format detection
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.UploadView = {
    init() {
      const zone = document.getElementById('upload-zone');
      const fileInput = document.getElementById('file-input');
      const folderInput = document.getElementById('folder-input');

      // Click to upload
      zone?.addEventListener('click', () => fileInput?.click());

      // File input change
      fileInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this._handleFiles(e.target.files);
      });

      // Folder input change
      folderInput?.addEventListener('change', (e) => {
        if (e.target.files.length > 0) this._handleFolder(e.target.files);
      });

      // Drag & drop
      zone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone?.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone?.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length > 0) {
          this._handleFiles(e.dataTransfer.files);
        }
      });

      // Prevent default drag behavior on body
      document.body.addEventListener('dragover', (e) => e.preventDefault());
      document.body.addEventListener('drop', (e) => e.preventDefault());
    },

    async _handleFiles(files) {
      const file = files[0];
      if (!file) return;

      try {
        this._showProgress();

        let result;
        if (file.name.toLowerCase().endsWith('.zip')) {
          result = await WCA.ZipHandler.extract(file, (pct, status) => {
            this._updateProgress(pct, status);
          });
        } else if (file.name.toLowerCase().endsWith('.txt')) {
          this._updateProgress(20, 'Reading text file...');
          result = await WCA.ZipHandler.readTextFile(file);
        } else {
          throw new Error('Unsupported file type. Please upload a .zip or .txt file.');
        }

        await this._processChat(result);
      } catch (err) {
        this._handleError(err);
      }
    },

    async _handleFolder(files) {
      try {
        this._showProgress();
        const result = await WCA.ZipHandler.readFolder(files, (pct, status) => {
          this._updateProgress(pct, status);
        });
        await this._processChat(result);
      } catch (err) {
        this._handleError(err);
      }
    },

    async _processChat(result) {
      this._updateProgress(85, 'Parsing messages...');

      try {
        const parsed = await WCA.ChatParser.parse(result.chatText, {
          onProgress: (pct, current, total) => {
            const adjusted = 85 + Math.round(pct * 0.1);
            this._updateProgress(adjusted, `Parsing messages (${WCA.Formatters.numberWithCommas(current)}/${WCA.Formatters.numberWithCommas(total)})...`);
          }
        });

        // Handle unknown format
        if (!parsed) {
          this._showFormatModal(result.chatText);
          return;
        }

        this._updateProgress(95, 'Mapping media files...');

        // Map media to messages
        if (result.mediaFiles && result.mediaFiles.length > 0) {
          WCA.MediaMapper.mapMediaToMessages(parsed.messages, result.mediaFiles);
        }

        this._updateProgress(98, 'Building analytics...');

        // Initialize store
        WCA.Store.init({
          messages: parsed.messages,
          mediaFiles: result.mediaFiles || [],
          senders: parsed.senders,
          chatName: parsed.chatName
        });

        // Initialize search index
        WCA.Search.init(parsed.messages);

        this._updateProgress(100, 'Complete!');

        setTimeout(() => {
          WCA.App.onChatLoaded();
        }, 500);

      } catch (err) {
        if (err.message === 'UNKNOWN_FORMAT') {
          this._showFormatModal(result.chatText, result.mediaFiles);
        } else {
          throw err;
        }
      }
    },

    _showFormatModal(chatText, mediaFiles) {
      const modal = document.getElementById('format-modal');
      if (!modal) return;
      modal.hidden = false;

      // Show preview lines
      const previews = WCA.ChatParser.getPreviewLines(chatText);
      const previewEl = modal.querySelector('.format-preview');
      if (previewEl) {
        previewEl.innerHTML = previews.map(l => `<code>${l.substring(0, 80)}...</code>`).join('<br>');
      }

      const confirmBtn = document.getElementById('format-confirm');
      confirmBtn?.addEventListener('click', async () => {
        modal.hidden = true;
        const dateFormat = document.getElementById('format-date-select').value;

        try {
          this._showProgress();
          this._updateProgress(85, 'Parsing with selected format...');

          const parsed = await WCA.ChatParser.parse(chatText, { dateFormat });

          if (mediaFiles) {
            WCA.MediaMapper.mapMediaToMessages(parsed.messages, mediaFiles);
          }

          WCA.Store.init({
            messages: parsed.messages,
            mediaFiles: mediaFiles || [],
            senders: parsed.senders,
            chatName: parsed.chatName
          });

          WCA.Search.init(parsed.messages);
          this._updateProgress(100, 'Complete!');

          setTimeout(() => WCA.App.onChatLoaded(), 500);
        } catch (err) {
          this._handleError(err);
        }
      }, { once: true });
    },

    _showProgress() {
      const progress = document.getElementById('upload-progress');
      const zone = document.getElementById('upload-zone');
      if (progress) progress.hidden = false;
      if (zone) zone.style.display = 'none';
    },

    _updateProgress(percent, text) {
      const fill = document.getElementById('progress-fill');
      const label = document.getElementById('progress-text');
      if (fill) fill.style.width = percent + '%';
      if (label) label.textContent = text || '';
    },

    _handleError(err) {
      console.error('Upload error:', err);
      WCA.Toast.error('Upload Failed', err.message || 'An error occurred while processing the file');

      // Reset UI
      const progress = document.getElementById('upload-progress');
      const zone = document.getElementById('upload-zone');
      if (progress) progress.hidden = true;
      if (zone) zone.style.display = '';
      this._updateProgress(0, '');
    }
  };
})();
