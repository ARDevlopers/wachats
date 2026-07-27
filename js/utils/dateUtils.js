/* ============================================================
   ChatLens Date Utilities
   Day.js wrappers for date grouping, comparison, formatting
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.DateUtils = {
    /**
     * Parse a date string based on detected format
     * @param {string} dateStr - e.g., "25/07/2026"
     * @param {string} timeStr - e.g., "10:30 AM"
     * @param {string} dateFormat - 'DMY', 'MDY', 'YMD'
     * @returns {Date|null}
     */
    parseDateTime(dateStr, timeStr, dateFormat) {
      if (!dateStr || !timeStr) return null;

      // Normalize separators
      const dateParts = dateStr.split(/[\/\-\.]/);
      if (dateParts.length !== 3) return null;

      let year, month, day;

      switch (dateFormat) {
        case 'YMD':
          year = parseInt(dateParts[0]);
          month = parseInt(dateParts[1]) - 1;
          day = parseInt(dateParts[2]);
          break;
        case 'MDY':
          month = parseInt(dateParts[0]) - 1;
          day = parseInt(dateParts[1]);
          year = parseInt(dateParts[2]);
          break;
        case 'DMY':
        default:
          day = parseInt(dateParts[0]);
          month = parseInt(dateParts[1]) - 1;
          year = parseInt(dateParts[2]);
          break;
      }

      // Handle 2-digit years
      if (year < 100) year += 2000;

      // Parse time - normalize narrow no-break space (U+202F) to regular space
      const normalizedTime = timeStr.replace(/\u202F/g, ' ').trim();
      const timeParts = normalizedTime.match(/^(\d{1,2})[:\.](\d{2})(?:[:\.](\d{2}))?\s*([AaPp][Mm])?$/);
      if (!timeParts) return null;

      let hours = parseInt(timeParts[1]);
      const minutes = parseInt(timeParts[2]);
      const seconds = timeParts[3] ? parseInt(timeParts[3]) : 0;
      const ampm = timeParts[4];

      if (ampm) {
        const isPM = ampm.toUpperCase() === 'PM';
        if (isPM && hours !== 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;
      }

      const date = new Date(year, month, day, hours, minutes, seconds);

      // Validate the date is valid
      if (isNaN(date.getTime())) return null;
      return date;
    },

    /**
     * Check if two dates are the same day
     * @param {Date} d1
     * @param {Date} d2
     * @returns {boolean}
     */
    isSameDay(d1, d2) {
      if (!d1 || !d2) return false;
      return d1.getFullYear() === d2.getFullYear() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getDate() === d2.getDate();
    },

    /**
     * Format date for display as a date separator
     * @param {Date} date
     * @returns {string}
     */
    formatSeparator(date) {
      if (!date) return '';
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (this.isSameDay(date, now)) return 'Today';
      if (this.isSameDay(date, yesterday)) return 'Yesterday';

      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return date.toLocaleDateString('en-US', { weekday: 'long' });
      }

      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    },

    /**
     * Get the day of week name
     * @param {Date} date
     * @returns {string}
     */
    getDayName(date) {
      return WCA.Constants.DAY_NAMES[date.getDay()];
    },

    /**
     * Get the month name
     * @param {Date} date
     * @returns {string}
     */
    getMonthName(date) {
      return WCA.Constants.MONTH_NAMES[date.getMonth()];
    },

    /**
     * Get AM/PM from a Date
     * @param {Date} date
     * @returns {string}
     */
    getAmPm(date) {
      return date.getHours() >= 12 ? 'PM' : 'AM';
    },

    /**
     * Get time period of day
     * @param {number} hour - 0-23
     * @returns {object} { label, emoji }
     */
    getTimePeriod(hour) {
      const periods = WCA.Constants.TIME_PERIODS;
      if (hour >= 6 && hour < 12) return periods.MORNING;
      if (hour >= 12 && hour < 17) return periods.AFTERNOON;
      if (hour >= 17 && hour < 21) return periods.EVENING;
      return periods.NIGHT;
    },

    /**
     * Check if a date is a weekend
     * @param {Date} date
     * @returns {boolean}
     */
    isWeekend(date) {
      const day = date.getDay();
      return day === 0 || day === 6;
    },

    /**
     * Group messages by a time unit
     * @param {Array} messages
     * @param {string} unit - 'year', 'month', 'week', 'day', 'hour', 'dayOfWeek', 'date'
     * @returns {Map<string, Array>}
     */
    groupBy(messages, unit) {
      const groups = new Map();

      for (const msg of messages) {
        if (!msg.timestamp) continue;
        const d = msg.timestamp;
        let key;

        switch (unit) {
          case 'year':
            key = d.getFullYear().toString();
            break;
          case 'month':
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            break;
          case 'week':
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - d.getDay());
            key = `${startOfWeek.getFullYear()}-${(startOfWeek.getMonth() + 1).toString().padStart(2, '0')}-${startOfWeek.getDate().toString().padStart(2, '0')}`;
            break;
          case 'day':
          case 'date':
            key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
            break;
          case 'hour':
            key = d.getHours().toString();
            break;
          case 'dayOfWeek':
            key = d.getDay().toString();
            break;
          case 'ampm':
            key = d.getHours() >= 12 ? 'PM' : 'AM';
            break;
          default:
            key = 'unknown';
        }

        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(msg);
      }

      return groups;
    },

    /**
     * Get date range of messages
     * @param {Array} messages
     * @returns {{start: Date, end: Date, days: number}}
     */
    getDateRange(messages) {
      if (!messages || messages.length === 0) return { start: null, end: null, days: 0 };

      let start = messages[0].timestamp;
      let end = messages[0].timestamp;

      for (const msg of messages) {
        if (!msg.timestamp) continue;
        if (msg.timestamp < start) start = msg.timestamp;
        if (msg.timestamp > end) end = msg.timestamp;
      }

      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      return { start, end, days };
    },

    /**
     * Generate all dates between start and end
     * @param {Date} start
     * @param {Date} end
     * @returns {Date[]}
     */
    getDatesBetween(start, end) {
      const dates = [];
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      const endNorm = new Date(end);
      endNorm.setHours(23, 59, 59, 999);

      while (current <= endNorm) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    },

    /**
     * Calculate time difference between two messages in minutes
     * @param {object} msg1
     * @param {object} msg2
     * @returns {number} Minutes
     */
    getTimeDiffMinutes(msg1, msg2) {
      if (!msg1?.timestamp || !msg2?.timestamp) return 0;
      return Math.abs(msg2.timestamp - msg1.timestamp) / (1000 * 60);
    }
  };
})();
