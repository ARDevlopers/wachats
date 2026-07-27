/* ============================================================
   ChatLens Lightbox
   Full-screen image/video viewer with navigation
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Lightbox = {
    el: null,
    mediaContainer: null,
    infoEl: null,
    items: [],
    currentIndex: 0,

    init() {
      this.el = document.getElementById('lightbox');
      this.mediaContainer = document.getElementById('lightbox-media');
      this.infoEl = document.getElementById('lightbox-info');

      document.getElementById('lightbox-close')?.addEventListener('click', () => this.close());
      document.getElementById('lightbox-download')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.downloadCurrent();
      });
      document.getElementById('lightbox-prev')?.addEventListener('click', () => this.prev());
      document.getElementById('lightbox-next')?.addEventListener('click', () => this.next());
      this.el?.querySelector('.lightbox-overlay')?.addEventListener('click', () => this.close());

      document.addEventListener('keydown', (e) => {
        if (!this.el || this.el.hidden) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.prev();
        if (e.key === 'ArrowRight') this.next();
      });
    },

    downloadCurrent() {
      const item = this.items[this.currentIndex];
      if (!item || !item.url) return;
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.name || 'media';
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (WCA.Toast) WCA.Toast.success('Download Started', item.name || 'Media file');
    },

    /**
     * Open lightbox with media items
     * @param {Array} items - [{url, type, name, sender, date}]
     * @param {number} startIndex
     */
    open(items, startIndex = 0) {
      this.items = items;
      this.currentIndex = startIndex;
      if (this.el) this.el.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      this._render();
    },

    close() {
      if (this.el) this.el.style.display = 'none';
      document.body.style.overflow = '';
      this._cleanupMedia();
    },

    prev() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        this._render();
      }
    },

    next() {
      if (this.currentIndex < this.items.length - 1) {
        this.currentIndex++;
        this._render();
      }
    },

    _cleanupMedia() {
      if (this.mediaContainer) {
        const videos = this.mediaContainer.querySelectorAll('video');
        videos.forEach(v => {
          try { v.pause(); v.src = ''; v.load(); } catch (e) {}
        });
        this.mediaContainer.innerHTML = '';
      }
      if (WCA.AudioPlayer && typeof WCA.AudioPlayer.stopAll === 'function') {
        WCA.AudioPlayer.stopAll();
      }
    },

    _render() {
      const item = this.items[this.currentIndex];
      if (!item) return;

      this._cleanupMedia();

      if (item.type === 'video' || (item.category === 'videos')) {
        const video = document.createElement('video');
        video.src = item.url;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        this.mediaContainer.appendChild(video);
      } else {
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = item.name || '';
        img.addEventListener('click', (e) => e.stopPropagation());
        this.mediaContainer.appendChild(img);
      }

      // Update info
      const parts = [];
      if (item.sender) parts.push(item.sender);
      if (item.name) parts.push(item.name);
      parts.push(`${this.currentIndex + 1} / ${this.items.length}`);
      this.infoEl.textContent = parts.join(' · ');

      // Update prev/next visibility
      const prevBtn = document.getElementById('lightbox-prev');
      const nextBtn = document.getElementById('lightbox-next');
      if (prevBtn) prevBtn.style.display = this.currentIndex > 0 ? 'flex' : 'none';
      if (nextBtn) nextBtn.style.display = this.currentIndex < this.items.length - 1 ? 'flex' : 'none';
    }
  };
})();
