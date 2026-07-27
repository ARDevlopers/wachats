/* ============================================================
   ChatLens Timeline, Search, and Settings Views
   ============================================================ */
(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  /* ── Timeline View ───────────────────────────────────── */
  WCA.TimelineView = {
    init() {},
    render() {
      const container = document.getElementById('timeline-container');
      if (!container) return;

      const messages = WCA.Store.filteredMessages.filter(m => !m.isSystem && m.timestamp);
      if (messages.length === 0) { container.innerHTML = '<div class="empty-state"><h3>No data</h3></div>'; return; }

      const grouped = WCA.DateUtils.groupBy(messages, 'month');
      const sortedMonths = [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));

      let html = '<div class="timeline-header"><h2>Conversation Timeline</h2><p>Navigate through your chat history</p></div><div class="timeline">';

      sortedMonths.forEach(([monthKey, msgs]) => {
        const [year, month] = monthKey.split('-');
        const monthName = WCA.Constants.MONTH_NAMES[parseInt(month) - 1];
        const words = msgs.reduce((s, m) => s + (m.text ? m.text.split(/\s+/).length : 0), 0);
        const media = msgs.filter(m => m.hasMedia).length;
        const firstMsg = msgs[0];
        const preview = msgs.find(m => m.text && !m.isDeleted && !m.hasMedia);

        html += `
          <div class="timeline-item" data-date="${monthKey}-01">
            <div class="timeline-node"></div>
            <div class="timeline-card" onclick="WCA.App.navigate('chat'); WCA.ChatView.scrollToDate(new Date('${year}-${month}-01'));">
              <div class="timeline-card-header">
                <span class="timeline-date">${monthName} ${year}</span>
                <span class="timeline-relative">${WCA.Formatters.relativeTime(firstMsg.timestamp)}</span>
              </div>
              <div class="timeline-stats">
                <div class="timeline-stat"><span class="timeline-stat-value">${WCA.Formatters.number(msgs.length)}</span><span class="timeline-stat-label">Messages</span></div>
                <div class="timeline-stat"><span class="timeline-stat-value">${WCA.Formatters.number(words)}</span><span class="timeline-stat-label">Words</span></div>
                <div class="timeline-stat"><span class="timeline-stat-value">${media}</span><span class="timeline-stat-label">Media</span></div>
              </div>
              ${preview ? `<div class="timeline-preview">${WCA.Formatters.truncate(preview.text, 120)}</div>` : ''}
            </div>
          </div>`;
      });

      html += '</div>';
      container.innerHTML = html;
    }
  };

  /* ── Search View ─────────────────────────────────────── */
  WCA.SearchView = {
    init() {
      const input = document.getElementById('search-input');
      input?.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        WCA.Search.debouncedSearch(query, (results, q) => this._renderResults(results, q));
      });

      WCA.Store.on('search:results', (data) => {
        this._renderResults(data.results, data.query);
        const input = document.getElementById('search-input');
        if (input && !input.value) input.value = data.query;
      });
    },

    render() {
      const input = document.getElementById('search-input');
      input?.focus();
    },

    _renderResults(results, query) {
      const container = document.getElementById('search-results');
      const countEl = document.getElementById('search-count');
      if (!container) return;

      if (countEl) countEl.textContent = results.length > 0 ? `${results.length} results found` : query.length >= 2 ? 'No results found' : '';

      if (results.length === 0) {
        container.innerHTML = query.length >= 2 ? '<div class="empty-state"><h3>No results</h3><p>Try a different search term</p></div>' : '';
        return;
      }

      container.innerHTML = results.slice(0, 200).map(r => {
        const msg = r.item;
        const highlighted = WCA.Search.highlight(msg.text || '', query);
        const time = msg.timestamp ? WCA.Formatters.date(msg.timestamp, 'medium') + ' ' + WCA.Formatters.time(msg.timestamp) : '';

        return `<div class="search-result-item" onclick="WCA.App.navigate('chat'); WCA.ChatView.scrollToDate(new Date('${msg.timestamp?.toISOString()}'));">
          <div class="search-result-sender">${msg.sender || 'System'}</div>
          <div class="search-result-text">${highlighted}</div>
          <div class="search-result-time">${time}</div>
        </div>`;
      }).join('');
    }
  };

  /* ── Settings View ───────────────────────────────────── */
  WCA.SettingsView = {
    init() {
      // Theme options
      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', () => {
          WCA.Themes.setTheme(btn.dataset.theme);
        });
      });

      WCA.Store.on('theme:changed', () => {
        document.querySelectorAll('.theme-option').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.theme === WCA.Themes.preference);
        });
        // Re-render charts with new theme
        if (WCA.Store.messages.length > 0) {
          WCA.AnalyticsView.rendered = false;
        }
      });

      // Export buttons in settings
      document.getElementById('export-pdf')?.addEventListener('click', () => WCA.App.exportReport('pdf'));
      document.getElementById('export-html')?.addEventListener('click', () => WCA.App.exportReport('html'));
      document.getElementById('export-json')?.addEventListener('click', () => WCA.App.exportReport('json'));
      document.getElementById('export-csv')?.addEventListener('click', () => WCA.App.exportReport('csv'));
    },

    render() {
      // Update theme option active states
      document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === WCA.Themes.preference);
      });
    }
  };
})();
