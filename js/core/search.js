/* ============================================================
   ChatLens Search Engine
   Fuse.js integration for fuzzy search with highlighting
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Search = {
    _fuse: null,
    _debounceTimer: null,

    /**
     * Initialize search index with messages
     * @param {Array} messages
     */
    init(messages) {
      if (typeof Fuse === 'undefined') {
        console.warn('Fuse.js not loaded, search will use simple matching');
        this._fuse = null;
        return;
      }

      this._fuse = new Fuse(messages, {
        keys: ['text', 'sender'],
        threshold: 0.3,
        distance: 200,
        minMatchCharLength: 2,
        includeMatches: true,
        includeScore: true,
        ignoreLocation: true
      });
    },

    /**
     * Search messages
     * @param {string} query
     * @param {number} maxResults
     * @returns {Array<{item: object, matches: Array, score: number}>}
     */
    search(query, maxResults = 500) {
      if (!query || query.length < 2) return [];

      if (this._fuse) {
        return this._fuse.search(query, { limit: maxResults });
      }

      // Fallback: simple string matching
      const lower = query.toLowerCase();
      const results = [];
      const messages = WCA.Store.filteredMessages;

      for (let i = 0; i < messages.length && results.length < maxResults; i++) {
        const msg = messages[i];
        const textMatch = msg.text && msg.text.toLowerCase().includes(lower);
        const senderMatch = msg.sender && msg.sender.toLowerCase().includes(lower);

        if (textMatch || senderMatch) {
          results.push({
            item: msg,
            score: textMatch ? 0.1 : 0.5,
            matches: textMatch ? [{
              key: 'text',
              indices: this._findIndices(msg.text.toLowerCase(), lower)
            }] : []
          });
        }
      }

      return results;
    },

    /**
     * Find match indices for highlighting
     * @param {string} text
     * @param {string} query
     * @returns {Array<[number, number]>}
     */
    _findIndices(text, query) {
      const indices = [];
      let pos = 0;
      while ((pos = text.indexOf(query, pos)) !== -1) {
        indices.push([pos, pos + query.length - 1]);
        pos += query.length;
      }
      return indices;
    },

    /**
     * Highlight matching text in a string
     * @param {string} text
     * @param {string} query
     * @returns {string} HTML string with highlights
     */
    highlight(text, query) {
      if (!text || !query || query.length < 2) return this._escapeHtml(text || '');

      const escaped = this._escapeHtml(text);
      const queryEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${queryEscaped})`, 'gi');

      return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
    },

    /**
     * Escape HTML to prevent XSS
     */
    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    /**
     * Debounced search for live input
     * @param {string} query
     * @param {function} callback
     */
    debouncedSearch(query, callback) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        const results = this.search(query);
        callback(results, query);
      }, WCA.Constants.SEARCH.DEBOUNCE_MS);
    }
  };
})();
