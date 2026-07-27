/* ============================================================
   ChatLens Theme Manager
   Dark/Light/System theme with localStorage persistence
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};
  const STORAGE_KEY = WCA.Constants.STORAGE_PREFIX + 'theme';

  WCA.Themes = {
    current: 'dark',
    preference: 'dark', // 'dark', 'light', 'auto'

    /**
     * Initialize theme from saved preference or default to dark
     */
    init() {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.preference = saved || 'dark';
      this._applyPreference();

      // Listen for system theme changes
      if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (this.preference === 'auto') this._applyPreference();
        });
      }
    },

    /**
     * Set theme preference
     * @param {'dark'|'light'|'auto'} pref
     */
    setTheme(pref) {
      this.preference = pref;
      localStorage.setItem(STORAGE_KEY, pref);

      // Add transition class for smooth switch
      document.documentElement.classList.add('theme-transitioning');
      this._applyPreference();

      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 500);

      WCA.Store.emit('theme:changed', { theme: this.current, preference: this.preference });
    },

    /**
     * Toggle between dark and light
     */
    toggle() {
      const next = this.current === 'dark' ? 'light' : 'dark';
      this.setTheme(next);
    },

    /**
     * Apply the current preference
     */
    _applyPreference() {
      let theme = this.preference;

      if (theme === 'auto') {
        theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark' : 'light';
      }

      this.current = theme;
      document.documentElement.setAttribute('data-theme', theme);
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content', theme === 'dark' ? '#0a0a0f' : '#f0f2f7'
      );

      this._updateUI();
    },

    /**
     * Update theme toggle button icons
     */
    _updateUI() {
      const sunIcon = document.querySelector('.icon-sun');
      const moonIcon = document.querySelector('.icon-moon');

      if (sunIcon && moonIcon) {
        if (this.current === 'dark') {
          sunIcon.style.display = 'block';
          moonIcon.style.display = 'none';
        } else {
          sunIcon.style.display = 'none';
          moonIcon.style.display = 'block';
        }
      }

      // Update theme option buttons
      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === this.preference);
      });
    },

    /**
     * Get appropriate chart theme colors
     * @returns {object}
     */
    getChartTheme() {
      const isDark = this.current === 'dark';
      return {
        backgroundColor: 'transparent',
        textColor: isDark ? '#a0a0b8' : '#5a5a7a',
        axisLineColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        splitLineColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        tooltipBg: isDark ? '#1a1a2e' : '#ffffff',
        tooltipBorder: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
        tooltipText: isDark ? '#f0f0f5' : '#1a1a2e',
      };
    }
  };
})();
