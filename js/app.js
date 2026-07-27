/* ============================================================
   ChatLens App
   Main application controller - initialization and navigation
   ============================================================ */
(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.App = {
    currentView: 'upload',
    isLoaded: false,

    /**
     * Initialize the application
     */
    init() {
      // Initialize theme first (prevents flash)
      WCA.Themes.init();

      // Initialize UI components
      WCA.Toast.init();
      WCA.Sidebar.init();
      WCA.Topbar.init();
      WCA.FilterPanel.init();
      WCA.Lightbox.init();

      // Initialize views
      WCA.UploadView.init();
      WCA.ChatView.init();
      WCA.MediaView.init();
      WCA.AnalyticsView.init();
      WCA.TimelineView.init();
      WCA.SearchView.init();
      WCA.SettingsView.init();

      // Start on upload view
      this.navigate('upload');

      // Show initial state
      document.getElementById('app-loader')?.remove();
      document.querySelector('.app')?.classList.add('loaded');

      console.log('%c🔍 ChatLens v1.0', 'color: #6c5ce7; font-size: 20px; font-weight: bold;');
      console.log('%cAll data is processed locally. Nothing leaves your browser.', 'color: #a29bfe; font-size: 12px;');
    },

    /**
     * Navigate to a view
     * @param {string} viewName
     */
    navigate(viewName) {
      // Can't navigate to analysis views without data
      if (!this.isLoaded && !['upload', 'settings'].includes(viewName)) return;

      this.currentView = viewName;

      // Update view visibility
      document.querySelectorAll('.view').forEach(v => {
        v.classList.toggle('active', v.id === `view-${viewName}`);
        v.hidden = v.id !== `view-${viewName}`;
      });

      // Update sidebar
      WCA.Sidebar.setActive(viewName);

      // Update topbar title
      const titles = {
        upload: 'Upload Chat',
        chat: 'Chat View',
        analytics: 'Analytics Dashboard',
        media: 'Media Gallery',
        timeline: 'Timeline',
        search: 'Search',
        settings: 'Settings'
      };
      document.getElementById('topbar-title').textContent = titles[viewName] || '';

      // Render view content
      switch (viewName) {
        case 'chat': WCA.ChatView.render(); break;
        case 'analytics': WCA.AnalyticsView.render(); break;
        case 'media': WCA.MediaView.render(); break;
        case 'timeline': WCA.TimelineView.render(); break;
        case 'search': WCA.SearchView.render(); break;
        case 'settings': WCA.SettingsView.render(); break;
      }

      // Resize charts after navigation (in case container sizes changed)
      setTimeout(() => WCA.ChartFactory.resizeAll(), 100);
    },

    /**
     * Called when chat data is successfully loaded
     */
    onChatLoaded() {
      this.isLoaded = true;

      const stats = WCA.Store.getStats();

      // Enable sidebar navigation
      WCA.Sidebar.enableNavigation();

      // Update topbar
      WCA.Topbar.setChatName(WCA.Store.chatName);
      WCA.Topbar.setQuickStats(stats);

      // Update sidebar badges
      WCA.Sidebar.setBadge('chat', WCA.Formatters.number(stats.totalMessages));
      WCA.Sidebar.setBadge('media', WCA.Formatters.number(stats.totalMedia));

      // Show success toast
      WCA.Toast.success(
        'Chat Loaded! 🎉',
        `${WCA.Formatters.numberWithCommas(stats.totalMessages)} messages from ${stats.senderCount} participants across ${stats.daysActive} days`
      );

      // Navigate to analytics
      this.navigate('analytics');
    },

    /**
     * Export report
     * @param {string} format
     */
    exportReport(format) {
      if (!this.isLoaded) {
        WCA.Toast.warning('No Data', 'Please upload a chat first');
        return;
      }
      WCA.Exporter.export(format);
    },

    /**
     * Reset the app
     */
    reset() {
      if (WCA.AudioPlayer && typeof WCA.AudioPlayer.stopAll === 'function') {
        WCA.AudioPlayer.stopAll();
      }
      WCA.MediaMapper.cleanup(WCA.Store.mediaFiles);
      WCA.Store.reset();
      WCA.ChartFactory.disposeAll();
      if (WCA.VirtualScroll && typeof WCA.VirtualScroll.destroy === 'function') {
        WCA.VirtualScroll.destroy();
      }
      this.isLoaded = false;
      WCA.AnalyticsView.rendered = false;
      WCA.Topbar.setChatName('ChatLens');
      WCA.Topbar.setQuickStats(null);
      WCA.Topbar.updateFilterBadge(0);
      this.navigate('upload');
    }
  };

  // Boot the application when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WCA.App.init());
  } else {
    WCA.App.init();
  }
})();
