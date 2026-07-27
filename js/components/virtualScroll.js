/* ============================================================
   ChatLens Virtual Scroll
   GPU-accelerated, zero-flicker rendering for 100K+ messages
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.VirtualScroll = {
    container: null,
    items: [],
    renderFn: null,
    itemHeight: 78,
    bufferSize: 15,
    _scrollHandler: null,
    _startIndex: 0,
    _endIndex: 0,
    _spacer: null,
    _content: null,
    _renderedRange: { start: -1, end: -1 },

    /**
     * Initialize virtual scroll
     * @param {HTMLElement} container - Scroll container
     * @param {Array} items - Data items
     * @param {function} renderFn - Function(item, index) => HTMLElement
     * @param {object} opts - { itemHeight, bufferSize }
     */
    init(container, items, renderFn, opts = {}) {
      this.container = container;
      this.items = items;
      this.renderFn = renderFn;
      this.itemHeight = opts.itemHeight || 78;
      this.bufferSize = opts.bufferSize || 15;

      // Clean container & set up layout
      container.innerHTML = '';
      container.classList.add('virtual-scroll-container');

      this._spacer = document.createElement('div');
      this._spacer.className = 'virtual-scroll-spacer';
      this._spacer.style.height = (items.length * this.itemHeight) + 'px';
      this._spacer.style.width = '100%';
      this._spacer.style.pointerEvents = 'none';

      this._content = document.createElement('div');
      this._content.className = 'virtual-scroll-content';
      this._content.style.position = 'absolute';
      this._content.style.left = '0';
      this._content.style.right = '0';
      this._content.style.top = '0';
      this._content.style.willChange = 'transform';
      this._content.style.transform = 'translate3d(0, 0, 0)';

      container.style.position = 'relative';
      container.appendChild(this._spacer);
      container.appendChild(this._content);

      this._renderedRange = { start: -1, end: -1 };

      // Bind scroll handler using requestAnimationFrame
      this._scrollHandler = this._throttle(() => this._onScroll(), 16);
      container.addEventListener('scroll', this._scrollHandler, { passive: true });

      // Initial render
      this._onScroll(true);
    },

    /**
     * Update items and re-render
     */
    update(items) {
      this.items = items;
      this._renderedRange = { start: -1, end: -1 };
      if (this._spacer) this._spacer.style.height = (items.length * this.itemHeight) + 'px';
      this._onScroll(true);
    },

    /**
     * Scroll to a specific item index
     */
    scrollTo(index) {
      if (!this.container) return;
      const top = index * this.itemHeight;
      this.container.scrollTop = top;
    },

    /**
     * Scroll to bottom
     */
    scrollToBottom() {
      if (!this.container) return;
      this.container.scrollTop = this.container.scrollHeight;
    },

    /**
     * Handle scroll event without flickering
     */
    _onScroll(force = false) {
      if (!this.container || this.items.length === 0) return;

      const scrollTop = this.container.scrollTop;
      const viewportHeight = this.container.clientHeight;
      const totalHeight = this.items.length * this.itemHeight;

      // Calculate visible range with buffer
      let startIndex = Math.floor(scrollTop / this.itemHeight) - this.bufferSize;
      let endIndex = Math.ceil((scrollTop + viewportHeight) / this.itemHeight) + this.bufferSize;

      startIndex = Math.max(0, startIndex);
      endIndex = Math.min(this.items.length, endIndex);

      // Prevent unnecessary DOM tearing if scroll offset hasn't crossed buffer boundary threshold
      if (!force && Math.abs(startIndex - this._renderedRange.start) < 3 && endIndex === this._renderedRange.end) {
        return;
      }

      this._startIndex = startIndex;
      this._endIndex = endIndex;
      this._renderedRange = { start: startIndex, end: endIndex };

      // GPU-accelerated smooth positioning (eliminates layout jump/flicker)
      this._content.style.transform = `translate3d(0, ${startIndex * this.itemHeight}px, 0)`;

      // Build visible DOM items in fragment
      const fragment = document.createDocumentFragment();
      for (let i = startIndex; i < endIndex; i++) {
        const item = this.items[i];
        const el = this.renderFn(item, i);

        if (typeof el === 'string') {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = el;
          fragment.appendChild(wrapper.firstElementChild || wrapper);
        } else if (el instanceof Node) {
          fragment.appendChild(el);
        }
      }

      // Single fast DOM swap
      this._content.innerHTML = '';
      this._content.appendChild(fragment);

      // Emit scroll status event
      WCA.Store.emit('chat:scroll', {
        scrollTop,
        scrollHeight: totalHeight,
        clientHeight: viewportHeight,
        isNearBottom: scrollTop + viewportHeight >= totalHeight - 200
      });
    },

    /**
     * Throttle function using requestAnimationFrame
     */
    _throttle(fn, limit) {
      let ticking = false;
      return function(...args) {
        if (!ticking) {
          requestAnimationFrame(() => {
            fn.apply(this, args);
            ticking = false;
          });
          ticking = true;
        }
      };
    },

    /**
     * Cleanup
     */
    destroy() {
      if (this.container && this._scrollHandler) {
        this.container.removeEventListener('scroll', this._scrollHandler);
      }
      this.container = null;
      this.items = [];
      this._renderedRange = { start: -1, end: -1 };
    }
  };
})();
