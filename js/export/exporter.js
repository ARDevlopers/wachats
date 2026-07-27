/* ============================================================
   ChatLens Export Engine
   Export analytics as JSON, CSV, HTML, or PDF
   ============================================================ */
(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.Exporter = {
    /**
     * Export report in specified format
     * @param {string} format - 'json', 'csv', 'html', 'pdf'
     */
    async export(format) {
      const stats = WCA.Store.getStats();
      const senderStats = WCA.Store.getSenderStats();
      const topEmojis = WCA.EmojiUtils.getTopEmojis(WCA.Store.messages, 20);

      switch (format) {
        case 'json': return this._exportJSON(stats, senderStats, topEmojis);
        case 'csv': return this._exportCSV(stats, senderStats);
        case 'html': return this._exportHTML(stats, senderStats, topEmojis);
        case 'pdf': return this._exportPDF(stats, senderStats, topEmojis);
        default: WCA.Toast.error('Export Error', 'Unsupported format');
      }
    },

    _download(content, filename, type) {
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    _exportJSON(stats, senderStats, topEmojis) {
      const data = {
        exportDate: new Date().toISOString(),
        chatName: WCA.Store.chatName,
        overview: stats,
        senderBreakdown: senderStats.map(s => ({
          name: s.name, messages: s.messageCount, words: s.wordCount,
          media: s.mediaCount, emojis: s.emojiCount, links: s.linkCount,
          avgMessageLength: s.avgMessageLength, mostActiveHour: s.mostActiveHour,
          mostActiveDay: s.mostActiveDay
        })),
        topEmojis: topEmojis.map(e => ({ emoji: e.emoji, count: e.count })),
        dateRange: {
          start: WCA.Store.dateRange.start?.toISOString(),
          end: WCA.Store.dateRange.end?.toISOString(),
          days: WCA.Store.dateRange.days
        }
      };

      this._download(JSON.stringify(data, null, 2), `chatlens_${WCA.Store.chatName}_report.json`, 'application/json');
      WCA.Toast.success('Export Complete', 'JSON report downloaded');
    },

    _exportCSV(stats, senderStats) {
      let csv = 'Metric,Value\n';
      csv += `Chat Name,"${WCA.Store.chatName}"\n`;
      csv += `Total Messages,${stats.totalMessages}\n`;
      csv += `Total Words,${stats.totalWords}\n`;
      csv += `Total Media,${stats.totalMedia}\n`;
      csv += `Total Emojis,${stats.totalEmojis}\n`;
      csv += `Total Links,${stats.totalLinks}\n`;
      csv += `Days Active,${stats.daysActive}\n`;
      csv += `Messages Per Day,${stats.messagesPerDay}\n`;
      csv += `Date Range Start,${WCA.Store.dateRange.start?.toLocaleDateString()}\n`;
      csv += `Date Range End,${WCA.Store.dateRange.end?.toLocaleDateString()}\n`;
      csv += '\n\nSender,Messages,Words,Media,Emojis,Links,Avg Message Length\n';

      for (const s of senderStats) {
        csv += `"${s.name}",${s.messageCount},${s.wordCount},${s.mediaCount},${s.emojiCount},${s.linkCount},${s.avgMessageLength}\n`;
      }

      this._download(csv, `chatlens_${WCA.Store.chatName}_report.csv`, 'text/csv');
      WCA.Toast.success('Export Complete', 'CSV report downloaded');
    },

    _exportHTML(stats, senderStats, topEmojis) {
      const isDark = WCA.Themes.current === 'dark';
      const bg = isDark ? '#0a0a0f' : '#f0f2f7';
      const fg = isDark ? '#f0f0f5' : '#1a1a2e';
      const card = isDark ? '#141424' : '#ffffff';
      const accent = '#6c5ce7';

      const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>ChatLens Report - ${WCA.Store.chatName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;background:${bg};color:${fg};padding:40px;max-width:900px;margin:0 auto}
  h1{font-size:2.5rem;margin-bottom:8px;background:linear-gradient(135deg,${accent},#a29bfe);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  h2{font-size:1.5rem;margin:32px 0 16px;padding-bottom:8px;border-bottom:2px solid ${accent}40}
  .subtitle{color:${fg}80;margin-bottom:32px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin:16px 0}
  .card{background:${card};border:1px solid ${fg}15;border-radius:12px;padding:20px;text-align:center}
  .card .value{font-size:1.8rem;font-weight:800;color:${accent};font-family:monospace}
  .card .label{font-size:0.8rem;color:${fg}60;text-transform:uppercase;margin-top:4px}
  table{width:100%;border-collapse:collapse;margin:16px 0;background:${card};border-radius:12px;overflow:hidden}
  th,td{padding:12px 16px;text-align:left;border-bottom:1px solid ${fg}10}
  th{background:${accent}15;color:${accent};font-weight:700;font-size:0.85rem;text-transform:uppercase}
  .emoji-grid{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
  .emoji-item{background:${card};border:1px solid ${fg}10;border-radius:10px;padding:12px;text-align:center;min-width:70px}
  .emoji-item span{font-size:2rem;display:block}
  .emoji-item small{color:${fg}60;font-size:0.8rem}
  .footer{margin-top:48px;text-align:center;color:${fg}40;font-size:0.8rem}
</style></head><body>
  <h1>📊 ChatLens Report</h1>
  <p class="subtitle">Analysis of "${WCA.Store.chatName}" · ${WCA.Formatters.date(WCA.Store.dateRange.start)} to ${WCA.Formatters.date(WCA.Store.dateRange.end)}</p>

  <h2>📈 Overview</h2>
  <div class="grid">
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalMessages)}</div><div class="label">Messages</div></div>
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalWords)}</div><div class="label">Words</div></div>
    <div class="card"><div class="value">${stats.totalMedia}</div><div class="label">Media</div></div>
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalEmojis)}</div><div class="label">Emojis</div></div>
    <div class="card"><div class="value">${stats.totalLinks}</div><div class="label">Links</div></div>
    <div class="card"><div class="value">${stats.daysActive}</div><div class="label">Days</div></div>
    <div class="card"><div class="value">${stats.messagesPerDay}</div><div class="label">Msgs/Day</div></div>
    <div class="card"><div class="value">${stats.deletedCount}</div><div class="label">Deleted</div></div>
  </div>

  <h2>👥 Sender Breakdown</h2>
  <table>
    <tr><th>Sender</th><th>Messages</th><th>Words</th><th>Media</th><th>Emojis</th><th>Avg Length</th></tr>
    ${senderStats.map(s => `<tr><td><strong>${s.name}</strong></td><td>${WCA.Formatters.numberWithCommas(s.messageCount)}</td><td>${WCA.Formatters.numberWithCommas(s.wordCount)}</td><td>${s.mediaCount}</td><td>${s.emojiCount}</td><td>${s.avgMessageLength}</td></tr>`).join('')}
  </table>

  <h2>😀 Top Emojis</h2>
  <div class="emoji-grid">
    ${topEmojis.slice(0, 15).map(e => `<div class="emoji-item"><span>${e.emoji}</span><small>${e.count}</small></div>`).join('')}
  </div>

  <div class="footer">Generated by ChatLens · ${new Date().toLocaleDateString()} · All data processed locally</div>
</body></html>`;

      this._download(html, `chatlens_${WCA.Store.chatName}_report.html`, 'text/html');
      WCA.Toast.success('Export Complete', 'Interactive HTML report downloaded');
    },

    async _exportPDF(stats, senderStats, topEmojis) {
      // Generate a printable view and trigger print
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        WCA.Toast.error('Popup Blocked', 'Please allow popups to export PDF');
        return;
      }

      // Use the HTML export content in a print-friendly format
      const html = this._getPrintHTML(stats, senderStats, topEmojis);
      printWindow.document.write(html);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          // printWindow.close() after print is handled by browser
        }, 500);
      };

      WCA.Toast.info('PDF Export', 'Use Print → Save as PDF in the dialog');
    },

    _getPrintHTML(stats, senderStats, topEmojis) {
      return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>ChatLens Report - ${WCA.Store.chatName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',sans-serif;padding:20px;color:#1a1a2e;background:#fff}
  h1{font-size:2rem;margin-bottom:4px;color:#6c5ce7}
  h2{font-size:1.2rem;margin:24px 0 12px;border-bottom:2px solid #6c5ce740;padding-bottom:4px}
  .subtitle{color:#666;margin-bottom:24px;font-size:0.9rem}
  .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0}
  .card{border:1px solid #eee;border-radius:8px;padding:16px;text-align:center}
  .card .value{font-size:1.5rem;font-weight:800;color:#6c5ce7}
  .card .label{font-size:0.7rem;color:#888;text-transform:uppercase;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin:12px 0;font-size:0.9rem}
  th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eee}
  th{background:#f8f8fa;color:#6c5ce7;font-size:0.8rem}
  .emoji-grid{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
  .emoji-item{border:1px solid #eee;border-radius:8px;padding:8px;text-align:center}
  .emoji-item span{font-size:1.5rem}
  .emoji-item small{color:#888;font-size:0.7rem;display:block}
  @media print{body{padding:0}}
</style></head><body>
  <h1>📊 ChatLens Report</h1>
  <p class="subtitle">"${WCA.Store.chatName}" · ${WCA.Formatters.date(WCA.Store.dateRange.start)} — ${WCA.Formatters.date(WCA.Store.dateRange.end)}</p>
  <div class="grid">
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalMessages)}</div><div class="label">Messages</div></div>
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalWords)}</div><div class="label">Words</div></div>
    <div class="card"><div class="value">${stats.totalMedia}</div><div class="label">Media</div></div>
    <div class="card"><div class="value">${WCA.Formatters.numberWithCommas(stats.totalEmojis)}</div><div class="label">Emojis</div></div>
  </div>
  <h2>Sender Breakdown</h2>
  <table><tr><th>Sender</th><th>Messages</th><th>Words</th><th>Media</th><th>Emojis</th></tr>
  ${senderStats.map(s => `<tr><td>${s.name}</td><td>${s.messageCount}</td><td>${s.wordCount}</td><td>${s.mediaCount}</td><td>${s.emojiCount}</td></tr>`).join('')}</table>
  <h2>Top Emojis</h2>
  <div class="emoji-grid">${topEmojis.slice(0, 15).map(e => `<div class="emoji-item"><span>${e.emoji}</span><small>${e.count}</small></div>`).join('')}</div>
  <p style="margin-top:24px;color:#aaa;font-size:0.75rem;text-align:center">Generated by ChatLens · ${new Date().toLocaleDateString()}</p>
</body></html>`;
    }
  };
})();
