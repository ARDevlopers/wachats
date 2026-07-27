/* ============================================================
   ChatLens Formatters
   Number, file size, time duration, and percentage formatters
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Formatters = {
    /**
     * Format a number with K/M/B suffixes
     * @param {number} num
     * @param {number} decimals
     * @returns {string}
     */
    number(num, decimals = 1) {
      if (num === null || num === undefined || isNaN(num)) return '0';
      if (num < 1000) return num.toString();
      if (num < 1000000) return (num / 1000).toFixed(decimals).replace(/\.0+$/, '') + 'K';
      if (num < 1000000000) return (num / 1000000).toFixed(decimals).replace(/\.0+$/, '') + 'M';
      return (num / 1000000000).toFixed(decimals).replace(/\.0+$/, '') + 'B';
    },

    /**
     * Format a number with comma separators
     * @param {number} num
     * @returns {string}
     */
    numberWithCommas(num) {
      if (num === null || num === undefined) return '0';
      return num.toLocaleString('en-US');
    },

    /**
     * Format file size in bytes to human-readable
     * @param {number} bytes
     * @param {number} decimals
     * @returns {string}
     */
    fileSize(bytes, decimals = 1) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
    },

    /**
     * Format milliseconds to human-readable duration
     * @param {number} ms
     * @returns {string}
     */
    duration(ms) {
      if (!ms || ms <= 0) return '0s';
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ${hours % 24}h`;
      if (hours > 0) return `${hours}h ${minutes % 60}m`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    },

    /**
     * Format minutes to human-readable
     * @param {number} minutes
     * @returns {string}
     */
    minutesToReadable(minutes) {
      if (!minutes || minutes <= 0) return '< 1 min';
      if (minutes < 60) return `${Math.round(minutes)} min`;
      const h = Math.floor(minutes / 60);
      const m = Math.round(minutes % 60);
      if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
      const d = Math.floor(h / 24);
      const remH = h % 24;
      return remH > 0 ? `${d}d ${remH}h` : `${d}d`;
    },

    /**
     * Format percentage
     * @param {number} value
     * @param {number} total
     * @param {number} decimals
     * @returns {string}
     */
    percentage(value, total, decimals = 1) {
      if (!total || total === 0) return '0%';
      return ((value / total) * 100).toFixed(decimals) + '%';
    },

    /**
     * Format a Date object to readable string
     * @param {Date} date
     * @param {string} format - 'short', 'medium', 'long'
     * @returns {string}
     */
    date(date, format = 'medium') {
      if (!date || !(date instanceof Date)) return '';
      const options = {
        short: { month: 'short', day: 'numeric' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
      };
      return date.toLocaleDateString('en-US', options[format] || options.medium);
    },

    /**
     * Format time from Date
     * @param {Date} date
     * @param {boolean} use24h
     * @returns {string}
     */
    time(date, use24h = false) {
      if (!date || !(date instanceof Date)) return '';
      if (use24h) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    },

    /**
     * Get relative time string (e.g., "2 hours ago", "Yesterday")
     * @param {Date} date
     * @returns {string}
     */
    relativeTime(date) {
      if (!date) return '';
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      const months = Math.floor(days / 30);
      const years = Math.floor(days / 365);

      if (seconds < 60) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days === 1) return 'Yesterday';
      if (days < 7) return `${days} days ago`;
      if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
      if (months < 12) return `${months} months ago`;
      return `${years} years ago`;
    },

    /**
     * Truncate text with ellipsis
     * @param {string} text
     * @param {number} maxLength
     * @returns {string}
     */
    truncate(text, maxLength = 100) {
      if (!text || text.length <= maxLength) return text || '';
      return text.substring(0, maxLength).trim() + '…';
    },

    /**
     * Format hour number to 12h or 24h string
     * @param {number} hour - 0-23
     * @param {boolean} use24h
     * @returns {string}
     */
    hourLabel(hour, use24h = false) {
      if (use24h) return `${hour.toString().padStart(2, '0')}:00`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const h = hour % 12 || 12;
      return `${h} ${period}`;
    },

    /**
     * Ordinal number (1st, 2nd, 3rd, etc.)
     * @param {number} n
     * @returns {string}
     */
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
  };
})();
