/* ============================================================
   ChatLens Analytics View
   Complete dashboard: time analysis, heatmap, calendar, senders,
   language distribution (Gujarati, Hindi, English, Mixed),
   emoji analytics, word cloud, link domains, document breakdown,
   response times, AI behavioral insights, and fun statistics.
   ============================================================ */

(function () {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.AnalyticsView = {
    rendered: false,

    init() {
      WCA.Store.on('data:filtered', () => {
        this.rendered = false;
        if (document.getElementById('view-analytics')?.classList.contains('active')) {
          this.render();
        }
      });
      WCA.Store.on('data:loaded', () => {
        this.rendered = false;
      });
    },

    render() {
      const container = document.getElementById('analytics-sections');
      const cardsContainer = document.getElementById('stats-cards');
      if (!container || !cardsContainer) return;

      const messages = WCA.Store.filteredMessages;

      // STEP 10: Empty filtered state
      if (!messages || messages.length === 0) {
        cardsContainer.innerHTML = '';
        container.innerHTML = `
          <div class="empty-state">
            <div style="font-size: 3rem; margin-bottom: 16px;">🔍</div>
            <h3>No data available for the selected filters.</h3>
            <p>Try adjusting your date range, senders, or message filters.</p>
          </div>`;
        return;
      }

      // STEP 7: Destroy/Dispose previous charts before re-building DOM
      WCA.ChartFactory.disposeAll();

      const stats = WCA.Store.getStats();
      const senderStats = WCA.Store.getSenderStats();

      // 1. Render main stat cards
      this._renderStatCards(cardsContainer, stats, messages);

      // 2. Clear & rebuild section wrappers
      container.innerHTML = '';

      // Section definitions
      this._addSection(container, '⏱️', 'Time Analysis', 'time-analysis-charts');
      this._addSection(container, '🔥', 'Activity Heatmap', 'activity-heatmap-chart');
      this._addSection(container, '📅', 'Calendar Heatmap', 'calendar-heatmap-chart');
      this._addSection(container, '🗣️', 'Language Distribution', 'language-distribution-chart');
      this._addSection(container, '👥', 'Sender Analysis', 'sender-analysis');
      this._addSection(container, '📄', 'Document & Attachment Breakdown', 'document-breakdown');
      this._addSection(container, '😀', 'Emoji Analytics', 'emoji-analytics');
      this._addSection(container, '📝', 'Word Analytics', 'word-analytics');
      this._addSection(container, '🔗', 'Link & Domain Analytics', 'link-analytics');
      this._addSection(container, '⚡', 'Response & Conversation Streaks', 'response-analysis');
      this._addSection(container, '🧠', 'AI Behavioral Insights', 'behavior-insights');
      this._addSection(container, '🎉', 'Fun & Special Statistics', 'fun-stats');
      this._addSection(container, '🚀', 'Created & Engineered by AR Developer', 'ar-developer-dashboard-card');

      // Execute chart creation after DOM insertion
      this._renderTimeAnalysis(messages);
      this._renderActivityHeatmap(messages);
      this._renderCalendarHeatmap(messages);
      this._renderLanguageDistribution(messages);
      this._renderSenderAnalysis(senderStats, messages);
      this._renderDocumentBreakdown(messages);
      this._renderEmojiAnalytics(messages);
      this._renderWordAnalytics(messages);
      this._renderLinkAnalytics(messages);
      this._renderResponseAnalysis(messages);
      this._renderBehaviorInsights(messages, stats, senderStats);
      this._renderFunStats(messages, stats);
      this._renderDevCard();

      // Trigger secondary resize pass after browser paint
      setTimeout(() => WCA.ChartFactory.resizeAll(), 100);
      setTimeout(() => WCA.ChartFactory.resizeAll(), 300);

      this.rendered = true;
    },

    _addSection(container, icon, title, id) {
      const section = document.createElement('div');
      section.innerHTML = `
        <div class="analytics-section-header"><span class="section-icon">${icon}</span><h3>${title}</h3></div>
        <div id="${id}"></div>
      `;
      container.appendChild(section);
    },

    _renderStatCards(container, stats, messages) {
      let pdfCount = 0, excelCount = 0, wordCount = 0, locationCount = 0;
      for (const m of messages) {
        if (m.tags?.includes('pdf')) pdfCount++;
        if (m.tags?.includes('excel')) excelCount++;
        if (m.tags?.includes('word')) wordCount++;
        if (m.tags?.includes('location')) locationCount++;
      }

      const cards = [
        { icon: '💬', value: stats.totalMessages, label: 'Total Messages' },
        { icon: '📝', value: WCA.Formatters.number(stats.totalWords), label: 'Total Words' },
        { icon: '🖼️', value: stats.totalMedia, label: 'Media Files' },
        { icon: '📄', value: pdfCount + excelCount + wordCount, label: 'Documents' },
        { icon: '😀', value: WCA.Formatters.number(stats.totalEmojis), label: 'Emojis Used' },
        { icon: '🔗', value: stats.totalLinks, label: 'Links Shared' },
        { icon: '📍', value: locationCount, label: 'Locations' },
        { icon: '🗑️', value: stats.deletedCount, label: 'Deleted' }
      ];

      container.innerHTML = cards.map((c, i) => `
        <div class="stat-card anim-fade-in-up stagger-${i + 1}">
          <div class="stat-card__icon">${c.icon}</div>
          <div class="stat-card__value">${typeof c.value === 'number' ? WCA.Formatters.numberWithCommas(c.value) : c.value}</div>
          <div class="stat-card__label">${c.label}</div>
        </div>
      `).join('');
    },

    // ── Time Analysis (Messages by Hour, Messages by Day, Messages by Month) ──
    _renderTimeAnalysis(messages) {
      const el = document.getElementById('time-analysis-charts');
      if (!el) return;

      const hourly = new Array(24).fill(0);
      const daily = new Array(7).fill(0);
      const monthlyMap = new Map();

      let validTimestamps = 0;
      for (const msg of messages) {
        if (!msg.timestamp || isNaN(msg.timestamp.getTime()) || msg.isSystem) continue;
        validTimestamps++;

        const h = msg.timestamp.getHours();
        const d = msg.timestamp.getDay();
        hourly[h]++;
        daily[d]++;

        const monthKey = `${msg.timestamp.getFullYear()}-${(msg.timestamp.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      }

      const sortedMonths = [...monthlyMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

      // STEP 4: Log analytics arrays to console as requested
      console.log('--- CHATLENS ANALYTICS DATA VERIFICATION ---');
      console.log('Total Parsed Messages:', messages.length);
      console.log('Valid Messages with Timestamps:', validTimestamps);
      console.log('Hourly Activity (24 values):', hourly);
      console.log('Daily Activity (7 values):', daily);
      console.log('Monthly Activity:', sortedMonths);

      el.innerHTML = `
        <div class="analytics-grid">
          <div class="chart-section">
            <div class="chart-section-header">
              <div class="chart-section-title">📊 Messages by Hour (00:00 - 23:59)</div>
            </div>
            <div class="chart-container" id="chart-hourly" style="height: 320px; min-height: 320px; width: 100%;"></div>
          </div>
          <div class="chart-section">
            <div class="chart-section-header">
              <div class="chart-section-title">📆 Messages by Day of Week</div>
            </div>
            <div class="chart-container" id="chart-daily" style="height: 320px; min-height: 320px; width: 100%;"></div>
          </div>
        </div>
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">📈 Messages by Month</div>
          </div>
          <div class="chart-container chart-container--lg" id="chart-monthly" style="height: 380px; min-height: 380px; width: 100%;"></div>
        </div>
      `;

      // 1. Messages by Hour (Line chart with smooth curve, peak marker, and custom tooltips)
      WCA.ChartFactory.line('chart-hourly', {
        labels: Array.from({ length: 24 }, (_, i) => WCA.Formatters.hourLabel(i)),
        values: hourly,
        name: 'Messages'
      }, {
        area: true,
        showPeak: true,
        gradient: ['#6c5ce7', '#a29bfe'],
        tooltipFormatter: (params) => {
          if (!params || !params[0]) return '';
          const p = params[0];
          const val = p.value;
          const pct = validTimestamps > 0 ? ((val / validTimestamps) * 100).toFixed(1) + '%' : '0%';
          return `<strong>Hour: ${p.name}</strong><br/>Total Messages: <strong>${val.toLocaleString()}</strong><br/>Share: <strong>${pct}</strong>`;
        }
      });

      // 2. Messages by Day (Bar chart)
      WCA.ChartFactory.bar('chart-daily', {
        labels: WCA.Constants.DAY_NAMES_SHORT,
        values: daily
      }, {
        gradient: ['#00cec9', '#55efc4'],
        showPeak: true,
        tooltipFormatter: (params) => {
          if (!params || !params[0]) return '';
          const p = params[0];
          const val = p.value;
          const pct = validTimestamps > 0 ? ((val / validTimestamps) * 100).toFixed(1) + '%' : '0%';
          return `<strong>Day: ${p.name}</strong><br/>Total Messages: <strong>${val.toLocaleString()}</strong><br/>Share: <strong>${pct}</strong>`;
        }
      });

      // 3. Messages by Month (Area line chart)
      WCA.ChartFactory.line('chart-monthly', {
        labels: sortedMonths.map(([k]) => k),
        values: sortedMonths.map(([, v]) => v),
        name: 'Messages'
      }, {
        area: true,
        showPeak: true,
        tooltipFormatter: (params) => {
          if (!params || !params[0]) return '';
          const p = params[0];
          const val = p.value;
          const pct = validTimestamps > 0 ? ((val / validTimestamps) * 100).toFixed(1) + '%' : '0%';
          return `<strong>Month: ${p.name}</strong><br/>Total Messages: <strong>${val.toLocaleString()}</strong><br/>Share: <strong>${pct}</strong>`;
        }
      });
    },

    // ── Activity Heatmap (24h x 7d) ──────────────────────
    _renderActivityHeatmap(messages) {
      const el = document.getElementById('activity-heatmap-chart');
      if (!el) return;

      const data = [];
      const hourLabels = Array.from({ length: 24 }, (_, i) => WCA.Formatters.hourLabel(i));
      const dayLabels = WCA.Constants.DAY_NAMES_SHORT;
      let maxVal = 0;

      const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));

      for (const msg of messages) {
        if (!msg.timestamp || isNaN(msg.timestamp.getTime()) || msg.isSystem) continue;
        grid[msg.timestamp.getDay()][msg.timestamp.getHours()]++;
      }

      for (let d = 0; d < 7; d++) {
        for (let h = 0; h < 24; h++) {
          data.push([h, d, grid[d][h]]);
          maxVal = Math.max(maxVal, grid[d][h]);
        }
      }

      el.innerHTML = '<div class="chart-section"><div class="chart-section-header"><div class="chart-section-title">🗓️ Hourly Activity Heatmap by Day</div></div><div class="chart-container chart-container--lg" id="chart-heatmap" style="height: 380px; min-height: 380px; width: 100%;"></div></div>';

      WCA.ChartFactory.heatmap('chart-heatmap', {
        xLabels: hourLabels, yLabels: dayLabels, values: data, max: maxVal,
        tooltipFormatter: (p) => `${dayLabels[p.data[1]]} ${hourLabels[p.data[0]]}: <strong>${p.data[2]}</strong> messages`
      });
    },

    // ── Calendar Heatmap (GitHub style) ──────────────────
    _renderCalendarHeatmap(messages) {
      const el = document.getElementById('calendar-heatmap-chart');
      if (!el) return;

      const dailyCounts = new Map();
      const years = new Set();
      let maxYear = 0;

      for (const msg of messages) {
        if (!msg.timestamp || isNaN(msg.timestamp.getTime()) || msg.isSystem) continue;
        const y = msg.timestamp.getFullYear();
        years.add(y);
        maxYear = Math.max(maxYear, y);

        const key = `${y}-${(msg.timestamp.getMonth() + 1).toString().padStart(2, '0')}-${msg.timestamp.getDate().toString().padStart(2, '0')}`;
        dailyCounts.set(key, (dailyCounts.get(key) || 0) + 1);
      }

      if (dailyCounts.size === 0 || maxYear === 0) {
        el.innerHTML = '<p class="text-muted p-md">No timestamped messages available for calendar view.</p>';
        return;
      }

      const data = [...dailyCounts.entries()].map(([date, count]) => [date, count]);
      const maxCount = Math.max(...dailyCounts.values(), 1);
      const sortedYears = [...years].sort((a, b) => b - a);

      let yearOptions = '';
      sortedYears.forEach(y => {
        yearOptions += `<option value="${y}" ${y === maxYear ? 'selected' : ''}>Year ${y}</option>`;
      });

      el.innerHTML = `
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">📅 Daily Activity (GitHub-style)</div>
            ${sortedYears.length > 1 ? `<select id="calendar-year-select" class="form-select form-select--sm" style="width: auto;">${yearOptions}</select>` : ''}
          </div>
          <div class="chart-container chart-container--sm" id="chart-calendar" style="height: 240px; min-height: 240px; width: 100%;"></div>
        </div>`;

      const renderYearCalendar = (selectedYear) => {
        const chart = WCA.ChartFactory.create('chart-calendar');
        if (!chart || chart._isFallback) return;

        const t = WCA.Themes.getChartTheme();
        const isDark = WCA.Themes ? WCA.Themes.current === 'dark' : true;

        chart.setOption({
          tooltip: {
            confine: true,
            formatter: (p) => `<strong>${p.data[0]}</strong><br/>Messages: <strong>${p.data[1].toLocaleString()}</strong>`
          },
          visualMap: {
            min: 0,
            max: maxCount,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            inRange: {
              color: isDark ? ['#1a1a2e', '#2d1b69', '#4a1a8a', '#6c5ce7', '#a29bfe'] : ['#f0f2f7', '#d5d0f5', '#b3a8f0', '#6c5ce7', '#4a3cb5']
            },
            textStyle: { color: t.textColor }
          },
          calendar: {
            top: 30,
            left: 35,
            right: 20,
            bottom: 35,
            range: selectedYear.toString(),
            cellSize: ['auto', 14],
            itemStyle: { borderWidth: 2, borderColor: isDark ? '#141424' : '#ffffff' },
            splitLine: { show: false },
            yearLabel: { show: false },
            monthLabel: { color: t.textColor, fontSize: 11 },
            dayLabel: { color: t.textColor, fontSize: 10, firstDay: 1 }
          },
          series: [{ type: 'heatmap', coordinateSystem: 'calendar', data }]
        }, true);
      };

      renderYearCalendar(maxYear);

      const yearSelect = document.getElementById('calendar-year-select');
      if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
          renderYearCalendar(parseInt(e.target.value, 10));
        });
      }
    },

    // ── Language Distribution (Gujarati, Hindi, English, Mixed) ──
    _renderLanguageDistribution(messages) {
      const el = document.getElementById('language-distribution-chart');
      if (!el) return;

      const langMap = new Map();
      for (const m of messages) {
        if (!m.text || m.isSystem) continue;
        const lang = m.language || 'English';
        langMap.set(lang, (langMap.get(lang) || 0) + 1);
      }

      const total = [...langMap.values()].reduce((a, b) => a + b, 0);

      const LANG_COLORS = {
        'English': '#6c5ce7',
        'Gujarati': '#00cec9',
        'Hindi': '#fdcb6e',
        'Mixed': '#e84393',
        'Other': '#00b894'
      };

      const data = [...langMap.entries()].map(([name, value], i) => {
        const color = LANG_COLORS[name] || WCA.Constants.CHART_COLORS.primary[i % WCA.Constants.CHART_COLORS.primary.length];
        return {
          name,
          value,
          itemStyle: { color }
        };
      });

      let legendBadges = '<div class="chart-legend-row" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">';
      data.forEach(d => {
        const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0;
        legendBadges += `
          <span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-primary);font-size:0.8rem;padding:4px 10px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${d.itemStyle.color};"></span>
            <strong>${d.name}</strong>: ${WCA.Formatters.numberWithCommas(d.value)} (${pct}%)
          </span>`;
      });
      legendBadges += '</div>';

      el.innerHTML = `
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">🗣️ Conversation Languages (Gujarati, Hindi, English, Mixed)</div>
          </div>
          ${legendBadges}
          <div class="chart-container" id="chart-language" style="height: 340px; min-height: 340px; width: 100%;"></div>
        </div>`;

      WCA.ChartFactory.pie('chart-language', data, { donut: true });
    },

    // ── Sender Analysis ──────────────────────────────────
    _renderSenderAnalysis(senderStats, messages) {
      const el = document.getElementById('sender-analysis');
      if (!el) return;

      const total = senderStats.reduce((s, sender) => s + sender.messageCount, 0);

      let html = '<div class="sender-cards">';
      senderStats.forEach((s, i) => {
        const color = WCA.Constants.CHART_COLORS.senders[i % WCA.Constants.CHART_COLORS.senders.length];
        html += `<div class="sender-card"><div class="sender-card-header"><div class="sender-avatar" style="background:${color}">${s.name.charAt(0).toUpperCase()}</div><div><div class="sender-name">${s.name}</div><div class="sender-subtitle">${WCA.Formatters.percentage(s.messageCount, total)} of messages</div></div></div><div class="sender-stats-grid"><div class="sender-stat"><div class="sender-stat-value">${WCA.Formatters.numberWithCommas(s.messageCount)}</div><div class="sender-stat-label">Messages</div></div><div class="sender-stat"><div class="sender-stat-value">${WCA.Formatters.numberWithCommas(s.wordCount)}</div><div class="sender-stat-label">Words</div></div><div class="sender-stat"><div class="sender-stat-value">${s.mediaCount}</div><div class="sender-stat-label">Media</div></div><div class="sender-stat"><div class="sender-stat-value">${s.emojiCount}</div><div class="sender-stat-label">Emojis</div></div></div></div>`;
      });
      html += '</div>';

      // Legend row
      let legendBadges = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">';
      senderStats.forEach((s, i) => {
        const color = WCA.Constants.CHART_COLORS.senders[i % WCA.Constants.CHART_COLORS.senders.length];
        legendBadges += `<span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--text-primary);font-size:0.75rem;padding:3px 8px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>${s.name}</span>`;
      });
      legendBadges += '</div>';

      html += `<div class="analytics-grid">
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">Message Share</div>
          </div>
          ${legendBadges}
          <div class="chart-container" id="chart-sender-pie" style="height: 300px; min-height: 300px; width: 100%;"></div>
        </div>
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">Activity by Hour</div>
          </div>
          ${legendBadges}
          <div class="chart-container" id="chart-sender-hours" style="height: 300px; min-height: 300px; width: 100%;"></div>
        </div>
      </div>`;

      el.innerHTML = html;

      const pieData = senderStats.map((s, i) => ({
        name: s.name,
        value: s.messageCount,
        itemStyle: { color: WCA.Constants.CHART_COLORS.senders[i % WCA.Constants.CHART_COLORS.senders.length] }
      }));

      WCA.ChartFactory.pie('chart-sender-pie', pieData, { donut: true });

      const series = senderStats.slice(0, 5).map((s, i) => {
        const color = WCA.Constants.CHART_COLORS.senders[i % WCA.Constants.CHART_COLORS.senders.length];
        return {
          name: s.name,
          type: 'line',
          smooth: true,
          data: s.hourCounts,
          lineStyle: { width: 2, color },
          itemStyle: { color },
          symbol: 'circle',
          symbolSize: 4
        };
      });

      WCA.ChartFactory.line('chart-sender-hours', {
        labels: Array.from({ length: 24 }, (_, i) => WCA.Formatters.hourLabel(i)),
        series
      });
    },

    // ── Document Breakdown (PDF, Excel, Word, PPT, APK, ZIP, vCard) ──
    _renderDocumentBreakdown(messages) {
      const el = document.getElementById('document-breakdown');
      if (!el) return;

      const docMap = {
        'PDF (📕)': 0,
        'Excel (📊)': 0,
        'Word (📘)': 0,
        'PowerPoint (📙)': 0,
        'APK Apps (🤖)': 0,
        'ZIP Archives (📦)': 0,
        'Contacts (👤)': 0,
        'Images (🖼️)': 0,
        'Videos (🎥)': 0,
        'Audio (🎙️)': 0
      };

      for (const m of messages) {
        if (!m.tags) continue;
        if (m.tags.includes('pdf')) docMap['PDF (📕)']++;
        if (m.tags.includes('excel')) docMap['Excel (📊)']++;
        if (m.tags.includes('word')) docMap['Word (📘)']++;
        if (m.tags.includes('ppt')) docMap['PowerPoint (📙)']++;
        if (m.tags.includes('apk')) docMap['APK Apps (🤖)']++;
        if (m.tags.includes('zip')) docMap['ZIP Archives (📦)']++;
        if (m.tags.includes('contact')) docMap['Contacts (👤)']++;
        if (m.tags.includes('image')) docMap['Images (🖼️)']++;
        if (m.tags.includes('video')) docMap['Videos (🎥)']++;
        if (m.tags.includes('audio')) docMap['Audio (🎙️)']++;
      }

      const data = Object.entries(docMap).filter(([, val]) => val > 0).map(([name, value]) => ({ name, value }));
      if (data.length === 0) {
        el.innerHTML = '<p class="text-muted p-md">No document files attached in this chat.</p>';
        return;
      }

      const totalDocs = data.reduce((a, b) => a + b.value, 0);
      const docColors = ['#00b894', '#00cec9', '#6c5ce7', '#fdcb6e', '#e84393', '#0984e3', '#e17055', '#a29bfe'];

      let legendBadges = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">';
      data.forEach((d, i) => {
        const color = docColors[i % docColors.length];
        const pct = totalDocs > 0 ? ((d.value / totalDocs) * 100).toFixed(1) : 0;
        legendBadges += `
          <span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-primary);font-size:0.78rem;padding:4px 10px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};"></span>
            <strong>${d.name}</strong>: ${d.value} (${pct}%)
          </span>`;
      });
      legendBadges += '</div>';

      el.innerHTML = `
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">📑 File & Document Types Shared</div>
          </div>
          ${legendBadges}
          <div class="chart-container" id="chart-documents" style="height: 320px; min-height: 320px; width: 100%;"></div>
        </div>`;

      WCA.ChartFactory.bar('chart-documents', {
        labels: data.map(d => d.name),
        values: data.map(d => d.value)
      }, { gradient: ['#00b894', '#00cec9'] });
    },

    _renderEmojiAnalytics(messages) {
      const el = document.getElementById('emoji-analytics');
      if (!el) return;

      const topEmojis = WCA.EmojiUtils.getTopEmojis(messages, 30);

      let html = '<div class="emoji-grid">';
      topEmojis.slice(0, 20).forEach(e => {
        html += `<div class="emoji-item"><span class="emoji-item-char">${e.emoji}</span><span class="emoji-item-count">${WCA.Formatters.number(e.count)}</span></div>`;
      });
      html += '</div>';

      if (topEmojis.length > 0) {
        html += '<div class="chart-section" style="margin-top:var(--space-lg)"><div class="chart-section-header"><div class="chart-section-title">Top Emojis Chart</div></div><div class="chart-container" id="chart-emoji-bar" style="height: 300px; min-height: 300px; width: 100%;"></div></div>';
      }

      el.innerHTML = html;

      if (topEmojis.length > 0) {
        WCA.ChartFactory.bar('chart-emoji-bar', {
          labels: topEmojis.slice(0, 15).map(e => e.emoji),
          values: topEmojis.slice(0, 15).map(e => e.count)
        }, { gradient: ['#fdcb6e', '#e17055'] });
      }
    },

    _renderWordAnalytics(messages) {
      const el = document.getElementById('word-analytics');
      if (!el) return;

      const wordFreq = new Map();
      for (const msg of messages) {
        if (!msg.text || msg.isSystem || msg.isDeleted) continue;
        const words = msg.text.toLowerCase().replace(/[^\w\s']/g, '').split(/\s+/);
        for (const word of words) {
          if (word.length < 3 || WCA.StopWords.has(word)) continue;
          wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
      }

      const sorted = [...wordFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50);

      let html = '<div class="word-cloud">';
      sorted.slice(0, 40).forEach(([word, count]) => {
        const size = Math.max(12, Math.min(32, 12 + (count / (sorted[0]?.[1] || 1)) * 20));
        html += `<span class="word-cloud-item" style="font-size:${size}px">${word} <small style="opacity:0.5">${count}</small></span>`;
      });
      html += '</div>';

      html += '<div class="chart-section" style="margin-top:var(--space-lg)"><div class="chart-section-header"><div class="chart-section-title">Most Used Words</div></div><div class="chart-container" id="chart-words-bar" style="height: 300px; min-height: 300px; width: 100%;"></div></div>';

      el.innerHTML = html;

      WCA.ChartFactory.bar('chart-words-bar', {
        labels: sorted.slice(0, 20).map(([w]) => w),
        values: sorted.slice(0, 20).map(([, c]) => c)
      }, { gradient: ['#00b894', '#55efc4'] });
    },

    _renderLinkAnalytics(messages) {
      const el = document.getElementById('link-analytics');
      if (!el) return;

      const domainFreq = new Map();
      const categoryFreq = new Map();

      for (const msg of messages) {
        if (!msg.links || msg.links.length === 0) continue;
        for (const url of msg.links) {
          try {
            const domain = new URL(url.startsWith('http') ? url : `http://${url}`).hostname.replace('www.', '');
            domainFreq.set(domain, (domainFreq.get(domain) || 0) + 1);

            let cat = 'Website';
            for (const [name, domains] of Object.entries(WCA.Constants.SOCIAL_DOMAINS)) {
              if (domains.some(d => domain.includes(d))) {
                cat = name.replace('_', ' ').toUpperCase();
                break;
              }
            }
            categoryFreq.set(cat, (categoryFreq.get(cat) || 0) + 1);
          } catch (e) { /* invalid URL */ }
        }
      }

      const sortedDomains = [...domainFreq.entries()].sort((a, b) => b[1] - a[1]);
      const maxCount = sortedDomains[0]?.[1] || 1;

      const categoryColors = [
        '#6c5ce7', '#00cec9', '#fdcb6e', '#e84393', '#00b894',
        '#e17055', '#0984e3', '#a29bfe', '#fab1a0', '#74b9ff'
      ];

      const totalCategoryLinks = [...categoryFreq.values()].reduce((a, b) => a + b, 0);

      const pieData = [...categoryFreq.entries()].map(([name, value], i) => ({
        name,
        value,
        itemStyle: { color: categoryColors[i % categoryColors.length] }
      }));

      let legendBadges = '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">';
      pieData.forEach(d => {
        const pct = totalCategoryLinks > 0 ? ((d.value / totalCategoryLinks) * 100).toFixed(1) : 0;
        legendBadges += `
          <span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:var(--text-primary);font-size:0.78rem;padding:4px 10px;border-radius:12px;display:inline-flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${d.itemStyle.color};"></span>
            <strong>${d.name}</strong>: ${d.value} (${pct}%)
          </span>`;
      });
      legendBadges += '</div>';

      let html = `<div class="analytics-grid">
        <div class="chart-section">
          <div class="chart-section-header">
            <div class="chart-section-title">Link Categories</div>
          </div>
          ${legendBadges}
          <div class="chart-container" id="chart-link-categories" style="height: 320px; min-height: 320px; width: 100%;"></div>
        </div>
        <div>
          <div class="domain-list">`;

      sortedDomains.slice(0, 15).forEach(([domain, count], i) => {
        const pct = (count / maxCount) * 100;
        html += `<div class="domain-item"><span class="domain-rank">${i + 1}</span><span class="domain-name">${domain}</span><div class="domain-bar"><div class="domain-bar-fill" style="width:${pct}%"></div></div><span class="domain-count">${count}</span></div>`;
      });

      html += '</div></div></div>';
      el.innerHTML = html;

      if (categoryFreq.size > 0) {
        WCA.ChartFactory.pie('chart-link-categories', pieData, { donut: true });
      }
    },

    _renderResponseAnalysis(messages) {
      const el = document.getElementById('response-analysis');
      if (!el) return;

      const nonSystem = messages.filter(m => !m.isSystem && m.sender && m.timestamp);
      if (nonSystem.length < 2) { el.innerHTML = '<p class="text-muted">Not enough data</p>'; return; }

      let totalResponseTime = 0;
      let responseCount = 0;
      let fastest = Infinity;
      let slowest = 0;

      for (let i = 1; i < nonSystem.length; i++) {
        if (nonSystem[i].sender !== nonSystem[i - 1].sender) {
          const diff = (nonSystem[i].timestamp - nonSystem[i - 1].timestamp) / (1000 * 60);
          if (diff > 0 && diff < 1440) {
            totalResponseTime += diff;
            responseCount++;
            fastest = Math.min(fastest, diff);
            slowest = Math.max(slowest, diff);
          }
        }
      }

      const avgReply = responseCount > 0 ? totalResponseTime / responseCount : 0;

      el.innerHTML = `<div class="response-time-cards"><div class="response-time-card"><div class="response-time-value text-accent">${WCA.Formatters.minutesToReadable(avgReply)}</div><div class="response-time-label">Avg Reply Time</div></div><div class="response-time-card"><div class="response-time-value text-teal">${WCA.Formatters.minutesToReadable(fastest === Infinity ? 0 : fastest)}</div><div class="response-time-label">Fastest Reply</div></div><div class="response-time-card"><div class="response-time-value text-warning">${WCA.Formatters.minutesToReadable(slowest)}</div><div class="response-time-label">Longest Delay</div></div><div class="response-time-card"><div class="response-time-value text-success">${WCA.Formatters.numberWithCommas(responseCount)}</div><div class="response-time-label">Conversations</div></div></div>`;
    },

    _renderBehaviorInsights(messages, stats, senderStats) {
      const el = document.getElementById('behavior-insights');
      if (!el) return;

      const insights = [];
      const nonSystem = messages.filter(m => !m.isSystem && m.timestamp);

      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      nonSystem.forEach(m => { hourCounts[m.timestamp.getHours()]++; dayCounts[m.timestamp.getDay()]++; });

      const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
      const peakDay = WCA.Constants.DAY_NAMES[dayCounts.indexOf(Math.max(...dayCounts))];
      const period = WCA.DateUtils.getTimePeriod(peakHour);

      insights.push({ icon: '⏰', text: `Peak chatting hour is <strong>${WCA.Formatters.hourLabel(peakHour)}</strong> (${period.label})` });
      insights.push({ icon: '📅', text: `Most active day is <strong>${peakDay}</strong>` });
      insights.push({ icon: '💬', text: `Average of <strong>${stats.messagesPerDay}</strong> messages per day over <strong>${stats.daysActive}</strong> days` });

      const amCount = hourCounts.slice(0, 12).reduce((s, c) => s + c, 0);
      const pmCount = hourCounts.slice(12).reduce((s, c) => s + c, 0);
      insights.push({ icon: pmCount > amCount ? '🌙' : '☀️', text: pmCount > amCount ? `Night Owl: ${WCA.Formatters.percentage(pmCount, amCount + pmCount)} of messages sent in PM` : `Early Bird: ${WCA.Formatters.percentage(amCount, amCount + pmCount)} of messages sent in AM` });

      if (senderStats.length >= 2) {
        insights.push({ icon: '🏆', text: `Top Contributor: <strong>${senderStats[0].name}</strong> with ${WCA.Formatters.numberWithCommas(senderStats[0].messageCount)} messages` });
      }

      el.innerHTML = '<div class="insights-grid">' + insights.map(ins => `<div class="insight-card"><span class="insight-card__icon">${ins.icon}</span><div class="insight-card__text">${ins.text}</div></div>`).join('') + '</div>';
    },

    _renderFunStats(messages, stats) {
      const el = document.getElementById('fun-stats');
      if (!el) return;

      const nonSystem = messages.filter(m => !m.isSystem && m.timestamp);

      let longestSilence = 0;
      for (let i = 1; i < nonSystem.length; i++) {
        const diff = nonSystem[i].timestamp - nonSystem[i - 1].timestamp;
        longestSilence = Math.max(longestSilence, diff);
      }

      let maxStreak = 0, currentStreak = 1;
      for (let i = 1; i < nonSystem.length; i++) {
        const diff = (nonSystem[i].timestamp - nonSystem[i - 1].timestamp) / (1000 * 60);
        if (diff <= 5) currentStreak++;
        else { maxStreak = Math.max(maxStreak, currentStreak); currentStreak = 1; }
      }
      maxStreak = Math.max(maxStreak, currentStreak);

      const lateNight = nonSystem.filter(m => { const h = m.timestamp.getHours(); return h >= 22 || h < 4; }).length;
      const lateNightPct = nonSystem.length > 0 ? ((lateNight / nonSystem.length) * 100).toFixed(0) : 0;
      const questions = nonSystem.filter(m => m.text && m.text.includes('?')).length;

      const funItems = [
        { emoji: '🤫', value: WCA.Formatters.duration(longestSilence), label: 'Longest Silence' },
        { emoji: '🔥', value: WCA.Formatters.numberWithCommas(maxStreak), label: 'Longest Message Streak' },
        { emoji: '🌙', value: lateNightPct + '%', label: 'Late Night Activity' },
        { emoji: '❓', value: WCA.Formatters.numberWithCommas(questions), label: 'Questions Asked' },
        { emoji: '📝', value: WCA.Formatters.numberWithCommas(stats.avgWordsPerMessage), label: 'Avg Words/Message' },
        { emoji: '📏', value: WCA.Formatters.numberWithCommas(stats.longestMessage?.length || 0), label: 'Longest Msg Length' },
      ];

      el.innerHTML = '<div class="fun-stats-grid">' + funItems.map(f => `<div class="fun-stat-card"><div class="fun-stat-emoji">${f.emoji}</div><div class="fun-stat-value">${f.value}</div><div class="fun-stat-label">${f.label}</div></div>`).join('') + '</div>';
    },

    _renderDevCard() {
      const el = document.getElementById('ar-developer-dashboard-card');
      if (!el) return;

      el.innerHTML = `
        <div class="dev-branding-card" style="margin-top: 0;">
          <div class="dev-header">
            <div class="dev-logo-box">⚡</div>
            <div class="dev-header-text">
              <h3>AR Developer</h3>
              <p>Mobile Apps, Websites & Custom Software Studio</p>
            </div>
          </div>
          <p class="dev-description">
            Engineering Superior Digital Solutions for Global Visionaries. Specializing in Flutter, Laravel, Cloud Architecture, and High-Scale Web Systems.
          </p>
          <div class="dev-links-row">
            <a href="https://ardevlopers.github.io/ardeveloper25" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--primary">🌐 Official Website</a>
            <a href="https://g.dev/ardeveloper25" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--glass">Google Dev Profile</a>
            <a href="https://github.com/ardeveloper" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--glass">GitHub</a>
            <a href="https://www.linkedin.com/in/ar-devlopers-845097423" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--glass">LinkedIn</a>
            <a href="https://instagram.com/ardeveloper25" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--glass">Instagram</a>
            <a href="https://youtube.com/@ardeveloper25" target="_blank" rel="noopener noreferrer" class="btn btn--sm btn--glass">YouTube</a>
          </div>
        </div>
      `;
    }
  };
})();
