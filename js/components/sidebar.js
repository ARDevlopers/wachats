/* ============================================================
   ChatLens Sidebar & Topbar
   Navigation, theme toggle, search bar, filter toggle
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  /* ── Sidebar ─────────────────────────────────────────── */
  WCA.Sidebar = {
    el: null,
    overlay: null,
    isCollapsed: false,

    init() {
      this.el = document.getElementById('sidebar');
      this.overlay = document.getElementById('sidebar-overlay');

      // Collapse toggle
      document.getElementById('sidebar-toggle')?.addEventListener('click', () => this.toggleCollapse());

      // Mobile menu toggle
      document.getElementById('menu-toggle')?.addEventListener('click', () => this.toggleMobile());

      // Overlay close
      this.overlay?.addEventListener('click', () => this.closeMobile());

      // Nav item clicks
      this.el?.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const view = item.dataset.view;
          if (view && !item.classList.contains('disabled')) {
            WCA.App.navigate(view);
            this.closeMobile();
          }
        });
      });

      // Mobile bottom nav bar item clicks
      document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const view = item.dataset.view;
          if (view && !item.classList.contains('disabled')) {
            WCA.App.navigate(view);
          }
        });
      });

      // Restore collapsed state
      const collapsed = localStorage.getItem(WCA.Constants.STORAGE_PREFIX + 'sidebar_collapsed');
      if (collapsed === 'true') {
        this.el.classList.add('collapsed');
        this.isCollapsed = true;
      }
    },

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      this.el.classList.toggle('collapsed', this.isCollapsed);
      localStorage.setItem(WCA.Constants.STORAGE_PREFIX + 'sidebar_collapsed', this.isCollapsed);

      // Trigger chart resize after transition
      setTimeout(() => WCA.ChartFactory.resizeAll(), 300);
    },

    toggleMobile() {
      this.el.classList.toggle('open');
      this.overlay?.classList.toggle('active');
    },

    closeMobile() {
      this.el.classList.remove('open');
      this.overlay?.classList.remove('active');
    },

    /**
     * Set active nav item
     * @param {string} viewName
     */
    setActive(viewName) {
      this.el?.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
      });
      document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
      });
    },

    enableNavigation() {
      this.el?.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('disabled');
      });
      document.querySelectorAll('.mobile-nav-item').forEach(item => {
        item.classList.remove('disabled');
      });
    },

    /**
     * Update badge on a nav item
     * @param {string} viewName
     * @param {string|number} value
     */
    setBadge(viewName, value) {
      const item = this.el?.querySelector(`.nav-item[data-view="${viewName}"]`);
      if (!item) return;
      let badge = item.querySelector('.nav-item-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-item-badge';
        item.appendChild(badge);
      }
      badge.textContent = value;
      badge.style.display = value ? '' : 'none';
    }
  };

  /* ── Topbar ──────────────────────────────────────────── */
  WCA.Topbar = {
    init() {
      // Theme toggle
      document.getElementById('theme-toggle')?.addEventListener('click', () => {
        WCA.Themes.toggle();
      });

      // Filter toggle
      document.getElementById('filter-toggle')?.addEventListener('click', () => {
        WCA.FilterPanel.toggle();
      });

      // Export button
      document.getElementById('export-btn')?.addEventListener('click', () => {
        const modal = document.getElementById('export-modal');
        if (modal) modal.hidden = false;
      });

      // Export modal close
      document.getElementById('export-modal-close')?.addEventListener('click', () => {
        document.getElementById('export-modal').hidden = true;
      });
      document.getElementById('export-modal')?.querySelector('.modal-overlay')?.addEventListener('click', () => {
        document.getElementById('export-modal').hidden = true;
      });

      // Export options
      document.querySelectorAll('.export-option-card').forEach(card => {
        card.addEventListener('click', () => {
          const format = card.dataset.format;
          WCA.App.exportReport(format);
          document.getElementById('export-modal').hidden = true;
        });
      });

      // Global search input
      const searchInput = document.getElementById('global-search-input');
      searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          WCA.App.navigate('search');
          WCA.Search.debouncedSearch(query, (results, q) => {
            WCA.Store.emit('search:results', { results, query: q });
          });
        }
      });

      searchInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const query = e.target.value.trim();
          if (query.length >= 2) {
            WCA.App.navigate('search');
            const results = WCA.Search.search(query);
            WCA.Store.emit('search:results', { results, query });
          }
        }
      });
    },

    /**
     * Update chat name in topbar
     * @param {string} name
     */
    setChatName(name) {
      const el = document.getElementById('chat-name');
      if (el) el.textContent = name || 'ChatLens';
    },

    /**
     * Update quick stats display
     * @param {object} stats
     */
    setQuickStats(stats) {
      const container = document.getElementById('topbar-quick-stats');
      if (!container || !stats) return;

      container.innerHTML = `
        <div class="quick-stat">
          <span>💬</span>
          <strong>${WCA.Formatters.number(stats.totalMessages)}</strong>
        </div>
        <div class="quick-stat">
          <span>📎</span>
          <strong>${WCA.Formatters.number(stats.totalMedia)}</strong>
        </div>
        <div class="quick-stat">
          <span>📅</span>
          <strong>${stats.daysActive}d</strong>
        </div>
      `;
      container.style.display = 'flex';
    },

    /**
     * Update filter badge count
     */
    updateFilterBadge(count) {
      const badge = document.getElementById('filter-badge');
      if (badge) {
        badge.textContent = count;
        badge.hidden = count === 0;
      }
    }
  };

  /* ── Filter Panel ────────────────────────────────────── */
  WCA.FilterPanel = {
    el: null,
    overlay: null,
    isOpen: false,

    init() {
      this.el = document.getElementById('filter-panel');
      this.overlay = document.getElementById('filter-overlay');

      document.getElementById('filter-close')?.addEventListener('click', () => this.close());
      this.overlay?.addEventListener('click', () => this.close());

      document.getElementById('filter-apply')?.addEventListener('click', () => this._applyFilters());
      document.getElementById('filter-clear')?.addEventListener('click', () => this._clearFilters());
    },

    toggle() {
      this.isOpen ? this.close() : this.open();
    },

    open() {
      this.isOpen = true;
      this.el?.classList.add('open');
      this.overlay?.classList.add('active');
      this._buildFilterUI();
    },

    close() {
      this.isOpen = false;
      this.el?.classList.remove('open');
      this.overlay?.classList.remove('active');
    },

    _buildFilterUI() {
      const body = document.getElementById('filter-panel-body');
      if (!body || WCA.Store.messages.length === 0) return;

      const avail = WCA.Filters.getAvailableValues(WCA.Store.messages);
      const state = WCA.Store.filterState;

      body.innerHTML = `
        <div class="filter-group">
          <div class="filter-group-title">📅 Date Range</div>
          <div class="filter-date-inputs">
            <div><label for="filter-date-from">From</label><input type="date" id="filter-date-from" value="${state.dateFrom ? state.dateFrom.toISOString().split('T')[0] : ''}"></div>
            <div><label for="filter-date-to">To</label><input type="date" id="filter-date-to" value="${state.dateTo ? state.dateTo.toISOString().split('T')[0] : ''}"></div>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-group-title">📆 Year</div>
          <select id="filter-year"><option value="">All Years</option>${avail.years.map(y => `<option value="${y}" ${state.year == y ? 'selected' : ''}>${y}</option>`).join('')}</select>
        </div>

        <div class="filter-group">
          <div class="filter-group-title">👤 Senders</div>
          <div class="filter-group-items">${avail.senders.map(s => `<label class="checkbox-label"><input type="checkbox" name="filter-sender" value="${s}" ${state.senders?.includes(s) ? 'checked' : ''}> ${s}</label>`).join('')}</div>
        </div>

        <div class="filter-group">
          <div class="filter-group-title">💬 Message Type</div>
          <div class="filter-group-items">
            <label class="checkbox-label"><input type="checkbox" id="filter-only-media" ${state.onlyMedia ? 'checked' : ''}> Only Media</label>
            <label class="checkbox-label"><input type="checkbox" id="filter-only-text" ${state.onlyText ? 'checked' : ''}> Only Text</label>
            <label class="checkbox-label"><input type="checkbox" id="filter-only-links" ${state.onlyLinks ? 'checked' : ''}> Only Links</label>
            <label class="checkbox-label"><input type="checkbox" id="filter-only-deleted" ${state.onlyDeleted ? 'checked' : ''}> Only Deleted</label>
            <label class="checkbox-label"><input type="checkbox" id="filter-only-forwarded" ${state.onlyForwarded ? 'checked' : ''}> Only Forwarded</label>
            <label class="checkbox-label"><input type="checkbox" id="filter-only-emojis" ${state.onlyEmojis ? 'checked' : ''}> Only Emojis</label>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-group-title">🕐 Time of Day</div>
          <select id="filter-ampm"><option value="">All</option><option value="AM" ${state.ampm === 'AM' ? 'selected' : ''}>AM (Morning)</option><option value="PM" ${state.ampm === 'PM' ? 'selected' : ''}>PM (Afternoon/Evening)</option></select>
        </div>

        <div class="filter-group">
          <div class="filter-group-title">📁 Media Type</div>
          <select id="filter-media-type"><option value="">All Types</option>${avail.mediaTypes.map(t => `<option value="${t.value}" ${state.mediaType === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}</select>
        </div>
      `;
    },

    _applyFilters() {
      const state = {};

      const dateFrom = document.getElementById('filter-date-from')?.value;
      const dateTo = document.getElementById('filter-date-to')?.value;
      if (dateFrom) state.dateFrom = new Date(dateFrom);
      if (dateTo) { state.dateTo = new Date(dateTo); state.dateTo.setHours(23, 59, 59); }

      const year = document.getElementById('filter-year')?.value;
      if (year) state.year = year;

      const senders = [...document.querySelectorAll('input[name="filter-sender"]:checked')].map(el => el.value);
      if (senders.length > 0) state.senders = senders;

      if (document.getElementById('filter-only-media')?.checked) state.onlyMedia = true;
      if (document.getElementById('filter-only-text')?.checked) state.onlyText = true;
      if (document.getElementById('filter-only-links')?.checked) state.onlyLinks = true;
      if (document.getElementById('filter-only-deleted')?.checked) state.onlyDeleted = true;
      if (document.getElementById('filter-only-forwarded')?.checked) state.onlyForwarded = true;
      if (document.getElementById('filter-only-emojis')?.checked) state.onlyEmojis = true;

      const ampm = document.getElementById('filter-ampm')?.value;
      if (ampm) state.ampm = ampm;

      const mediaType = document.getElementById('filter-media-type')?.value;
      if (mediaType) state.mediaType = mediaType;

      WCA.Store.applyFilters(state);
      WCA.Topbar.updateFilterBadge(WCA.Filters.countActive(state));

      this.close();
      WCA.Toast.success('Filters Applied', `${WCA.Store.filteredMessages.length} messages match`);
    },

    _clearFilters() {
      WCA.Store.clearFilters();
      WCA.Topbar.updateFilterBadge(0);
      this._buildFilterUI();
      WCA.Toast.info('Filters Cleared', 'Showing all messages');
    }
  };
})();
