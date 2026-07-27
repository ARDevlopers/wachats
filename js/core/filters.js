/* ============================================================
   ChatLens Filter Engine
   Composable filter chains for messages
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Filters = {
    /**
     * Apply all active filters to messages
     * @param {Array} messages - All messages
     * @param {object} state - Filter state object
     * @returns {Array} Filtered messages
     */
    apply(messages, state) {
      if (!state || Object.keys(state).length === 0) return messages;

      return messages.filter(msg => {
        // Date range filter
        if (state.dateFrom && msg.timestamp && msg.timestamp < state.dateFrom) return false;
        if (state.dateTo && msg.timestamp && msg.timestamp > state.dateTo) return false;

        // Year filter
        if (state.year && msg.timestamp && msg.timestamp.getFullYear() !== parseInt(state.year)) return false;

        // Month filter
        if (state.month !== undefined && state.month !== '' && msg.timestamp && msg.timestamp.getMonth() !== parseInt(state.month)) return false;

        // Day of week filter
        if (state.dayOfWeek !== undefined && state.dayOfWeek !== '' && msg.timestamp && msg.timestamp.getDay() !== parseInt(state.dayOfWeek)) return false;

        // Hour filter
        if (state.hour !== undefined && state.hour !== '' && msg.timestamp && msg.timestamp.getHours() !== parseInt(state.hour)) return false;

        // AM/PM filter
        if (state.ampm && msg.timestamp) {
          const isAM = msg.timestamp.getHours() < 12;
          if (state.ampm === 'AM' && !isAM) return false;
          if (state.ampm === 'PM' && isAM) return false;
        }

        // Sender filter
        if (state.senders && state.senders.length > 0) {
          if (!msg.sender || !state.senders.includes(msg.sender)) return false;
        }

        // Message type filters
        if (state.onlyMedia && !msg.hasMedia) return false;
        if (state.onlyText && (msg.hasMedia || msg.isSystem)) return false;
        if (state.onlyLinks && (!msg.text || !WCA.Constants.REGEX.URL.test(msg.text))) {
          WCA.Constants.REGEX.URL.lastIndex = 0;
          return false;
        }
        WCA.Constants.REGEX.URL.lastIndex = 0;

        if (state.onlyDeleted && !msg.isDeleted) return false;
        if (state.onlyForwarded && !msg.isForwarded) return false;
        if (state.onlyEmojis) {
          if (!msg.text || !WCA.EmojiUtils.isEmojiOnly(msg.text)) return false;
        }

        // Media type filters
        if (state.mediaType) {
          if (!msg.hasMedia) return false;
          if (state.mediaType === 'documents') {
            if (['images', 'videos', 'audio'].includes(msg.mediaCategory)) return false;
          } else if (msg.mediaCategory !== state.mediaType) {
            return false;
          }
        }

        // Search text filter (simple contains)
        if (state.searchText) {
          const search = state.searchText.toLowerCase();
          const inText = msg.text && msg.text.toLowerCase().includes(search);
          const inSender = msg.sender && msg.sender.toLowerCase().includes(search);
          if (!inText && !inSender) return false;
        }

        return true;
      });
    },

    /**
     * Count active filters
     * @param {object} state
     * @returns {number}
     */
    countActive(state) {
      if (!state) return 0;
      let count = 0;
      if (state.dateFrom || state.dateTo) count++;
      if (state.year) count++;
      if (state.month !== undefined && state.month !== '') count++;
      if (state.dayOfWeek !== undefined && state.dayOfWeek !== '') count++;
      if (state.hour !== undefined && state.hour !== '') count++;
      if (state.ampm) count++;
      if (state.senders && state.senders.length > 0) count++;
      if (state.onlyMedia) count++;
      if (state.onlyText) count++;
      if (state.onlyLinks) count++;
      if (state.onlyDeleted) count++;
      if (state.onlyForwarded) count++;
      if (state.onlyEmojis) count++;
      if (state.mediaType) count++;
      if (state.searchText) count++;
      return count;
    },

    /**
     * Get available filter values from messages
     * @param {Array} messages
     * @returns {object}
     */
    getAvailableValues(messages) {
      const years = new Set();
      const senders = new Set();

      for (const msg of messages) {
        if (msg.timestamp) years.add(msg.timestamp.getFullYear());
        if (msg.sender) senders.add(msg.sender);
      }

      return {
        years: [...years].sort((a, b) => b - a),
        senders: [...senders].sort(),
        months: WCA.Constants.MONTH_NAMES.map((name, i) => ({ value: i, label: name })),
        daysOfWeek: WCA.Constants.DAY_NAMES.map((name, i) => ({ value: i, label: name })),
        hours: Array.from({ length: 24 }, (_, i) => ({ value: i, label: WCA.Formatters.hourLabel(i) })),
        ampm: [{ value: 'AM', label: 'AM (Morning)' }, { value: 'PM', label: 'PM (Afternoon/Evening)' }],
        mediaTypes: [
          { value: 'images', label: 'Images' },
          { value: 'videos', label: 'Videos' },
          { value: 'audio', label: 'Audio' },
          { value: 'documents', label: 'Documents' }
        ]
      };
    }
  };
})();
