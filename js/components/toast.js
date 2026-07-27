/* ============================================================
   ChatLens Toast Notifications
   Animated toast notification system
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Toast = {
    container: null,

    init() {
      this.container = document.getElementById('toast-container');
    },

    /**
     * Show a toast notification
     * @param {string} title
     * @param {string} message
     * @param {string} type - 'success', 'warning', 'error', 'info'
     * @param {number} duration - ms (0 = permanent)
     */
    show(title, message, type = 'info', duration = 4000) {
      if (!this.container) this.init();

      const icons = { success: '✅', warning: '⚠️', error: '❌', info: 'ℹ️' };
      const toast = document.createElement('div');
      toast.className = `toast toast--${type}`;
      toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-body">
          <div class="toast-title">${title}</div>
          ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
        <button class="toast-close" aria-label="Close">✕</button>
      `;

      toast.querySelector('.toast-close').addEventListener('click', () => this._remove(toast));
      this.container.appendChild(toast);

      if (duration > 0) {
        setTimeout(() => this._remove(toast), duration);
      }

      return toast;
    },

    success(title, message) { return this.show(title, message, 'success'); },
    warning(title, message) { return this.show(title, message, 'warning'); },
    error(title, message) { return this.show(title, message, 'error'); },
    info(title, message) { return this.show(title, message, 'info'); },

    _remove(toast) {
      if (!toast || !toast.parentNode) return;
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }
  };
})();
