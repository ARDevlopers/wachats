/* ============================================================
   ChatLens Central Store
   State management with pub/sub event system
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Store = {
    // Raw data
    messages: [],
    mediaFiles: [],       // { name, type, category, size, blob, url, messageIndex }
    senders: [],
    chatName: '',
    dateRange: { start: null, end: null, days: 0 },

    // Filtered data
    filteredMessages: [],
    filterState: {},

    // Computed stats (lazy)
    _statsCache: null,
    _analyticsCache: {},

    // Event subscribers
    _listeners: {},

    /**
     * Initialize store with parsed data
     */
    init(data) {
      this.messages = data.messages || [];
      this.mediaFiles = data.mediaFiles || [];
      this.senders = data.senders || [];
      this.chatName = data.chatName || 'Chat';
      this.filteredMessages = [...this.messages];
      this.filterState = {};
      this._statsCache = null;
      this._analyticsCache = {};

      // Compute date range
      if (this.messages.length > 0) {
        this.dateRange = WCA.DateUtils.getDateRange(this.messages);
      }

      this.emit('data:loaded', {
        totalMessages: this.messages.length,
        totalMedia: this.mediaFiles.length,
        senders: this.senders,
        chatName: this.chatName,
        dateRange: this.dateRange
      });
    },

    /**
     * Get or compute general statistics
     */
    getStats() {
      if (this._statsCache) return this._statsCache;

      const msgs = this.messages;
      if (msgs.length === 0) return null;

      let totalWords = 0;
      let totalChars = 0;
      let longestMsg = { length: 0, text: '', sender: '' };
      let shortestMsg = { length: Infinity, text: '', sender: '' };
      let totalEmojis = 0;
      let totalLinks = 0;
      let deletedCount = 0;
      let editedCount = 0;
      let forwardedCount = 0;
      let imageCount = 0;
      let videoCount = 0;
      let audioCount = 0;
      let docCount = 0;
      let stickerCount = 0;
      let gifCount = 0;
      const linkSet = [];

      for (const msg of msgs) {
        if (msg.isSystem) continue;

        if (msg.isDeleted) { deletedCount++; continue; }
        if (msg.isEdited) editedCount++;
        if (msg.isForwarded) forwardedCount++;

        if (msg.text) {
          const words = msg.text.trim().split(/\s+/).filter(w => w.length > 0);
          totalWords += words.length;
          totalChars += msg.text.length;

          if (msg.text.length > longestMsg.length) {
            longestMsg = { length: msg.text.length, text: msg.text, sender: msg.sender };
          }
          if (msg.text.length < shortestMsg.length && msg.text.length > 0) {
            shortestMsg = { length: msg.text.length, text: msg.text, sender: msg.sender };
          }

          totalEmojis += WCA.EmojiUtils.count(msg.text);

          const urls = msg.text.match(WCA.Constants.REGEX.URL);
          if (urls) {
            totalLinks += urls.length;
            linkSet.push(...urls);
          }
        }

        if (msg.hasMedia) {
          switch (msg.mediaCategory) {
            case 'images': imageCount++; break;
            case 'videos': videoCount++; break;
            case 'audio': audioCount++; break;
            default: docCount++; break;
          }
        }

        if (msg.isSticker) stickerCount++;
        if (msg.isGif) gifCount++;
      }

      const nonSystemMsgs = msgs.filter(m => !m.isSystem);

      this._statsCache = {
        totalMessages: nonSystemMsgs.length,
        totalWords,
        totalChars,
        avgMessageLength: nonSystemMsgs.length > 0 ? Math.round(totalChars / nonSystemMsgs.length) : 0,
        avgWordsPerMessage: nonSystemMsgs.length > 0 ? Math.round(totalWords / nonSystemMsgs.length) : 0,
        longestMessage: longestMsg,
        shortestMessage: shortestMsg.length === Infinity ? { length: 0, text: '', sender: '' } : shortestMsg,
        totalMedia: imageCount + videoCount + audioCount + docCount,
        imageCount,
        videoCount,
        audioCount,
        docCount,
        stickerCount,
        gifCount,
        totalLinks,
        totalEmojis,
        deletedCount,
        editedCount,
        forwardedCount,
        senderCount: this.senders.length,
        dateRange: this.dateRange,
        daysActive: this.dateRange.days,
        messagesPerDay: this.dateRange.days > 0 ? Math.round(nonSystemMsgs.length / this.dateRange.days) : 0
      };

      return this._statsCache;
    },

    /**
     * Get sender-specific statistics
     */
    getSenderStats() {
      const cacheKey = 'senderStats';
      if (this._analyticsCache[cacheKey]) return this._analyticsCache[cacheKey];

      const senderMap = new Map();

      for (const msg of this.messages) {
        if (msg.isSystem || !msg.sender) continue;

        if (!senderMap.has(msg.sender)) {
          senderMap.set(msg.sender, {
            name: msg.sender,
            messageCount: 0,
            wordCount: 0,
            charCount: 0,
            mediaCount: 0,
            linkCount: 0,
            emojiCount: 0,
            deletedCount: 0,
            hourCounts: new Array(24).fill(0),
            dayCounts: new Array(7).fill(0)
          });
        }

        const s = senderMap.get(msg.sender);
        s.messageCount++;

        if (msg.isDeleted) { s.deletedCount++; continue; }

        if (msg.text) {
          const words = msg.text.trim().split(/\s+/).filter(w => w.length > 0);
          s.wordCount += words.length;
          s.charCount += msg.text.length;
          s.emojiCount += WCA.EmojiUtils.count(msg.text);

          const urls = msg.text.match(WCA.Constants.REGEX.URL);
          if (urls) s.linkCount += urls.length;
        }

        if (msg.hasMedia) s.mediaCount++;

        if (msg.timestamp) {
          s.hourCounts[msg.timestamp.getHours()]++;
          s.dayCounts[msg.timestamp.getDay()]++;
        }
      }

      // Compute derived stats
      for (const [, s] of senderMap) {
        s.avgMessageLength = s.messageCount > 0 ? Math.round(s.charCount / s.messageCount) : 0;
        s.mostActiveHour = s.hourCounts.indexOf(Math.max(...s.hourCounts));
        s.mostActiveDay = WCA.Constants.DAY_NAMES[s.dayCounts.indexOf(Math.max(...s.dayCounts))];
      }

      const result = [...senderMap.values()].sort((a, b) => b.messageCount - a.messageCount);
      this._analyticsCache[cacheKey] = result;
      return result;
    },

    /**
     * Apply filters and update filteredMessages
     */
    applyFilters(filterState) {
      this.filterState = filterState || {};
      this.filteredMessages = WCA.Filters.apply(this.messages, this.filterState);
      this.emit('data:filtered', {
        totalFiltered: this.filteredMessages.length,
        totalOriginal: this.messages.length,
        filters: this.filterState
      });
    },

    /**
     * Clear all filters
     */
    clearFilters() {
      this.filterState = {};
      this.filteredMessages = [...this.messages];
      this.emit('data:filtered', {
        totalFiltered: this.filteredMessages.length,
        totalOriginal: this.messages.length,
        filters: {}
      });
    },

    /**
     * Subscribe to an event
     */
    on(event, callback) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(callback);
    },

    /**
     * Unsubscribe from an event
     */
    off(event, callback) {
      if (!this._listeners[event]) return;
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    },

    /**
     * Emit an event
     */
    emit(event, data) {
      if (!this._listeners[event]) return;
      for (const callback of this._listeners[event]) {
        try { callback(data); } catch (e) { console.error(`Event handler error [${event}]:`, e); }
      }
    },

    /**
     * Reset store to initial state
     */
    reset() {
      this.messages = [];
      this.filteredMessages = [];
      this.mediaFiles = [];
      this.senders = [];
      this.chatName = '';
      this.dateRange = { start: null, end: null, days: 0 };
      this._statsCache = null;
      this._analyticsCache = {};
      this.filterState = {};
      this.emit('data:reset');
    }
  };
})();
