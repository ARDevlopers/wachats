/* ============================================================
   ChatLens Emoji Utilities
   Emoji detection, extraction, counting
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  // Comprehensive emoji regex covering Unicode emoji ranges
  const EMOJI_REGEX = /(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\u200D(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/gu;

  // Simpler fallback for browsers without Unicode property escapes
  const EMOJI_REGEX_FALLBACK = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]+/gu;

  let emojiRegex;
  try {
    // Test if the browser supports Unicode property escapes
    new RegExp('\\p{Emoji}', 'u');
    emojiRegex = EMOJI_REGEX;
  } catch (e) {
    emojiRegex = EMOJI_REGEX_FALLBACK;
  }

  WCA.EmojiUtils = {
    /**
     * Extract all emojis from a string
     * @param {string} text
     * @returns {string[]} Array of emoji characters
     */
    extract(text) {
      if (!text) return [];
      const matches = text.match(emojiRegex);
      return matches || [];
    },

    /**
     * Count total emojis in a string
     * @param {string} text
     * @returns {number}
     */
    count(text) {
      return this.extract(text).length;
    },

    /**
     * Check if a message is emoji-only (no text besides whitespace)
     * @param {string} text
     * @returns {boolean}
     */
    isEmojiOnly(text) {
      if (!text) return false;
      const stripped = text.replace(emojiRegex, '').replace(/[\s\u200D\uFE0F]/g, '');
      return stripped.length === 0 && this.count(text) > 0;
    },

    /**
     * Get frequency map of emojis from an array of messages
     * @param {Array} messages - Array of message objects with .text
     * @returns {Map<string, number>} Sorted by frequency descending
     */
    getFrequencyMap(messages) {
      const freq = new Map();

      for (const msg of messages) {
        if (!msg.text) continue;
        const emojis = this.extract(msg.text);
        for (const emoji of emojis) {
          freq.set(emoji, (freq.get(emoji) || 0) + 1);
        }
      }

      // Sort by frequency descending
      return new Map(
        [...freq.entries()].sort((a, b) => b[1] - a[1])
      );
    },

    /**
     * Get top N emojis
     * @param {Array} messages
     * @param {number} n
     * @returns {Array<{emoji: string, count: number}>}
     */
    getTopEmojis(messages, n = 20) {
      const freq = this.getFrequencyMap(messages);
      const result = [];
      let i = 0;
      for (const [emoji, count] of freq) {
        if (i >= n) break;
        result.push({ emoji, count });
        i++;
      }
      return result;
    },

    /**
     * Get total emoji count from messages
     * @param {Array} messages
     * @returns {number}
     */
    getTotalCount(messages) {
      let total = 0;
      for (const msg of messages) {
        if (msg.text) total += this.count(msg.text);
      }
      return total;
    },

    /**
     * Get emoji frequency per sender
     * @param {Array} messages
     * @returns {Map<string, Map<string, number>>}
     */
    getPerSenderFrequency(messages) {
      const result = new Map();
      for (const msg of messages) {
        if (!msg.sender || !msg.text) continue;
        if (!result.has(msg.sender)) result.set(msg.sender, new Map());
        const senderMap = result.get(msg.sender);
        const emojis = this.extract(msg.text);
        for (const emoji of emojis) {
          senderMap.set(emoji, (senderMap.get(emoji) || 0) + 1);
        }
      }
      return result;
    }
  };
})();
