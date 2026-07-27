/* ============================================================
   ChatLens Media Gallery View
   Selection buttons, multi-download zip, video lightbox navigation,
   and enhanced audio player integration.
   ============================================================ */
(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.MediaView = {
    currentType: 'all',
    currentSort: 'newest',
    selectedFiles: new Set(),
    currentDisplayedFiles: [],

    init() {
      document.querySelectorAll('.media-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.currentType = tab.dataset.type;
          this.render();
        });
      });

      document.getElementById('media-sort-select')?.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.render();
      });

      document.getElementById('media-select-all')?.addEventListener('click', () => {
        this.selectAll();
      });

      document.getElementById('media-deselect-all')?.addEventListener('click', () => {
        this.deselectAll();
      });

      document.getElementById('media-download-selected')?.addEventListener('click', () => {
        this.downloadSelected();
      });
    },

    _isDocument(category) {
      if (!category) return true;
      return !['images', 'videos', 'audio'].includes(category);
    },

    render() {
      const grid = document.getElementById('media-grid');
      if (!grid) return;

      let files = [...WCA.Store.mediaFiles];
      if (this.currentType !== 'all') {
        if (this.currentType === 'documents') {
          files = files.filter(f => this._isDocument(f.category));
        } else {
          files = files.filter(f => f.category === this.currentType);
        }
      }

      // Sort
      switch (this.currentSort) {
        case 'oldest': files.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); break;
        case 'largest': files.sort((a, b) => (b.size || 0) - (a.size || 0)); break;
        case 'smallest': files.sort((a, b) => (a.size || 0) - (b.size || 0)); break;
        default: files.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); break;
      }

      this.currentDisplayedFiles = files;

      if (files.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No media found</h3><p>Upload a chat export with media files</p></div>';
        this.updateSelectionUI();
        return;
      }

      // Update tab counts
      const allFiles = WCA.Store.mediaFiles;
      document.querySelectorAll('.media-tab').forEach(tab => {
        const type = tab.dataset.type;
        const count = type === 'all'
          ? allFiles.length
          : type === 'documents'
            ? allFiles.filter(f => this._isDocument(f.category)).length
            : allFiles.filter(f => f.category === type).length;
        let countEl = tab.querySelector('.tab-count');
        if (!countEl) { countEl = document.createElement('span'); countEl.className = 'tab-count'; tab.appendChild(countEl); }
        countEl.textContent = count > 0 ? `(${count})` : '';
      });

      grid.className = `media-grid ${this.currentType === 'audio' || this.currentType === 'documents' ? 'media-grid--list' : ''}`;

      const fragment = document.createDocumentFragment();
      for (const file of files) {
        fragment.appendChild(this._renderMediaCard(file));
      }
      grid.innerHTML = '';
      grid.appendChild(fragment);

      this.updateSelectionUI();
    },

    selectAll() {
      for (const f of this.currentDisplayedFiles) {
        this.selectedFiles.add(f);
      }
      this.render();
    },

    deselectAll() {
      this.selectedFiles.clear();
      this.render();
    },

    updateSelectionUI() {
      const count = this.selectedFiles.size;
      const countEl = document.getElementById('media-selected-count');
      const dlBtn = document.getElementById('media-download-selected');
      const selectAllBtn = document.getElementById('media-select-all');
      const deselectAllBtn = document.getElementById('media-deselect-all');

      if (countEl) countEl.textContent = count;
      if (dlBtn) dlBtn.disabled = count === 0;

      const isAllSelected = this.currentDisplayedFiles.length > 0 && this.currentDisplayedFiles.every(f => this.selectedFiles.has(f));

      if (selectAllBtn) selectAllBtn.style.display = isAllSelected ? 'none' : '';
      if (deselectAllBtn) deselectAllBtn.style.display = isAllSelected || count > 0 ? '' : 'none';
    },

    async downloadSelected() {
      const files = Array.from(this.selectedFiles);
      if (files.length === 0) return;

      if (files.length === 1) {
        const file = files[0];
        const a = document.createElement('a');
        a.href = file.url;
        a.download = file.name || 'media';
        document.body.appendChild(a);
        a.click();
        a.remove();
        WCA.Toast.success('Download Started', file.name);
        return;
      }

      if (typeof JSZip === 'undefined') {
        WCA.Toast.warning('ZIP Library Missing', 'Downloading items sequentially');
        files.forEach((file, idx) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = file.url;
            a.download = file.name || `media_${idx}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }, idx * 300);
        });
        return;
      }

      WCA.Toast.info('Preparing ZIP', `Packaging ${files.length} selected files...`);

      try {
        const zip = new JSZip();
        const mediaFolder = zip.folder('WhatsApp_Media');

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let blob = file.blob;
          if (!blob && file.url) {
            try {
              const res = await fetch(file.url);
              blob = await res.blob();
            } catch (e) {
              console.error('Failed to fetch blob for zip:', file.name, e);
            }
          }
          if (blob) {
            mediaFolder.file(file.name || `file_${i}.${file.ext || 'dat'}`, blob);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const chatName = (WCA.Store.chatName || 'Export').replace(/[^a-zA-Z0-9_-]/g, '_');
        const fileName = `WhatsApp_Media_${chatName}.zip`;

        const a = document.createElement('a');
        a.href = URL.createObjectURL(zipBlob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        WCA.Toast.success('Download Ready! 🎉', `${files.length} files saved in ${fileName}`);
      } catch (err) {
        console.error('Download selected zip error:', err);
        WCA.Toast.error('Download Failed', 'Could not create ZIP archive');
      }
    },

    _renderMediaCard(file) {
      const el = document.createElement('div');
      const isSelected = this.selectedFiles.has(file);

      const checkboxHtml = `
        <div class="media-checkbox-wrapper" onclick="event.stopPropagation();">
          <input type="checkbox" class="media-checkbox" ${isSelected ? 'checked' : ''} aria-label="Select file">
        </div>
      `;

      const toggleSelection = (e) => {
        e?.stopPropagation();
        if (this.selectedFiles.has(file)) {
          this.selectedFiles.delete(file);
          el.classList.remove('selected');
        } else {
          this.selectedFiles.add(file);
          el.classList.add('selected');
        }
        const cb = el.querySelector('.media-checkbox');
        if (cb) cb.checked = this.selectedFiles.has(file);
        this.updateSelectionUI();
      };

      if (file.category === 'images') {
        el.className = `media-card ${isSelected ? 'selected' : ''}`;
        el.innerHTML = `${checkboxHtml}<img src="${file.url}" alt="${file.name}" loading="lazy"><div class="media-card-overlay"><div class="media-card-name">${file.name}</div><div class="media-card-meta"><span>${WCA.Formatters.fileSize(file.size)}</span>${file.sender ? `<span>${file.sender}</span>` : ''}</div></div>`;

        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('media-checkbox') || e.target.classList.contains('media-checkbox-wrapper')) {
            toggleSelection();
            return;
          }
          const images = this.currentDisplayedFiles.filter(f => f.category === 'images');
          const idx = images.indexOf(file);
          WCA.Lightbox.open(images.map(f => ({ url: f.url, type: 'image', name: f.name, sender: f.sender, category: f.category })), Math.max(0, idx));
        });
      } else if (file.category === 'videos') {
        el.className = `media-card media-card--video ${isSelected ? 'selected' : ''}`;
        el.innerHTML = `${checkboxHtml}<video src="${file.url}" preload="metadata" muted></video><div class="media-card-overlay"><div class="media-card-name">${file.name}</div><div class="media-card-meta"><span>${WCA.Formatters.fileSize(file.size)}</span></div></div>`;

        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('media-checkbox') || e.target.classList.contains('media-checkbox-wrapper')) {
            toggleSelection();
            return;
          }
          // Pass ALL displayed videos so left/right navigation buttons work in Lightbox
          const videos = this.currentDisplayedFiles.filter(f => f.category === 'videos');
          const idx = videos.indexOf(file);
          WCA.Lightbox.open(videos.map(f => ({ url: f.url, type: 'video', name: f.name, sender: f.sender, category: 'videos' })), Math.max(0, idx));
        });
      } else if (file.category === 'audio') {
        el.className = `media-audio-item ${isSelected ? 'selected' : ''}`;
        el.innerHTML = `
          ${checkboxHtml}
          <div class="media-audio-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
          <div class="media-audio-info">
            <div class="media-audio-name">${file.name}</div>
            <div class="media-audio-meta">${WCA.Formatters.fileSize(file.size)}${file.sender ? ` · ${file.sender}` : ''}</div>
          </div>
        `;

        const playerEl = WCA.AudioPlayer.create(file.url, WCA.Formatters.fileSize(file.size), file.name);
        el.appendChild(playerEl);
      } else {
        el.className = `media-doc-item ${isSelected ? 'selected' : ''}`;
        const icon = WCA.Constants.FILE_ICONS[file.category] || WCA.Constants.FILE_ICONS.other;
        el.innerHTML = `
          ${checkboxHtml}
          <div class="media-doc-icon">${icon}</div>
          <div class="media-doc-info">
            <div class="media-doc-name">${file.name}</div>
            <div class="media-doc-meta">${WCA.Formatters.fileSize(file.size)} · ${file.ext?.toUpperCase()}${file.sender ? ` · ${file.sender}` : ''}</div>
          </div>
        `;
        const dl = document.createElement('a');
        dl.className = 'media-doc-download';
        dl.href = file.url;
        dl.download = file.name;
        dl.title = 'Download file';
        dl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
        el.appendChild(dl);

        el.addEventListener('click', (e) => {
          if (e.target.closest('.media-doc-download')) return;
          toggleSelection();
        });
      }

      const cbInput = el.querySelector('.media-checkbox');
      if (cbInput) {
        cbInput.addEventListener('change', (e) => toggleSelection(e));
      }

      return el;
    }
  };
})();

