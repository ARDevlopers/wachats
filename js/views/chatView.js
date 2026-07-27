/* ============================================================
   ChatLens Chat View
   Message rendering with zero-flicker incremental scroll pagination
   ("load data on scroll"), left-side positioning for contact messages
   from "WhatsApp Chat with...", custom file icons (PDF, Excel, Word,
   PPT, APK, ZIP, VCF), coordinates maps, live location cards, OTP &
   sensitive data toggles, links with favicons, and full Unicode
   language support (Gujarati, Hindi, English).
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.ChatView = {
    container: null,
    senderColors: new Map(),
    items: [],
    renderedCount: 0,
    BATCH_SIZE: 100,
    isLoadingMore: false,

    init() {
      this.container = document.getElementById('chat-messages');

      const scrollBtn = document.getElementById('scroll-bottom');
      scrollBtn?.addEventListener('click', () => {
        this.scrollToBottom();
      });

      // Bind scroll event for zero-flicker incremental scroll ("load data on scroll")
      this.container?.addEventListener('scroll', () => {
        const scrollTop = this.container.scrollTop;
        const clientHeight = this.container.clientHeight;
        const scrollHeight = this.container.scrollHeight;

        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 200;
        if (scrollBtn) scrollBtn.hidden = isNearBottom;

        // Trigger load data on scroll when nearing bottom
        if (this.renderedCount < this.items.length && !this.isLoadingMore) {
          const distanceToBottom = scrollHeight - (scrollTop + clientHeight);
          if (distanceToBottom < 500) {
            this.loadMoreData();
          }
        }
      });

      // Bind quick filter chips
      document.querySelectorAll('.chat-filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.chat-filter-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');

          const type = chip.dataset.filter;
          const state = { ...WCA.Store.filterState };

          // Reset type flags
          delete state.onlyText; delete state.onlyMedia; delete state.onlyLinks; delete state.onlyDeleted; delete state.mediaType;

          if (type === 'text') state.onlyText = true;
          else if (type === 'media') state.onlyMedia = true;
          else if (type === 'links') state.onlyLinks = true;
          else if (type === 'docs') state.mediaType = 'documents';
          else if (type === 'deleted') state.onlyDeleted = true;

          WCA.Store.applyFilters(state);
        });
      });

      // Bind sender dropdown filter
      const chatSenderSelect = document.getElementById('chat-sender-filter');
      chatSenderSelect?.addEventListener('change', (e) => {
        const val = e.target.value;
        const state = { ...WCA.Store.filterState };
        if (val) state.senders = [val]; else delete state.senders;
        WCA.Store.applyFilters(state);
      });

      // Bind all open-filter-panel buttons
      document.querySelectorAll('.open-filter-panel-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          WCA.FilterPanel.open();
        });
      });

      WCA.Store.on('data:loaded', () => {
        this._populateSenderSelects();
      });

      WCA.Store.on('data:filtered', () => {
        if (document.getElementById('view-chat')?.classList.contains('active')) {
          this.render();
        }
      });
    },

    _populateSenderSelects() {
      const senders = WCA.Store.senders || [];
      const chatSelect = document.getElementById('chat-sender-filter');
      const analyticsSelect = document.getElementById('analytics-sender-filter');
      const yearSelect = document.getElementById('analytics-year-filter');

      const optionsHtml = '<option value="">All Senders</option>' + senders.map(s => `<option value="${s}">${s}</option>`).join('');

      if (chatSelect) chatSelect.innerHTML = optionsHtml;
      if (analyticsSelect) {
        analyticsSelect.innerHTML = optionsHtml;
        analyticsSelect.onchange = (e) => {
          const val = e.target.value;
          const state = { ...WCA.Store.filterState };
          if (val) state.senders = [val]; else delete state.senders;
          WCA.Store.applyFilters(state);
        };
      }

      if (yearSelect) {
        const years = WCA.Filters.getAvailableValues(WCA.Store.messages).years;
        yearSelect.innerHTML = '<option value="">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
        yearSelect.onchange = (e) => {
          const val = e.target.value;
          const state = { ...WCA.Store.filterState };
          if (val) state.year = val; else delete state.year;
          WCA.Store.applyFilters(state);
        };
      }
    },

    render() {
      if (!this.container) return;

      const messages = WCA.Store.filteredMessages;
      if (messages.length === 0) {
        this.container.innerHTML = '<div class="empty-state"><h3>No messages to display</h3><p>Try adjusting your filters</p></div>';
        return;
      }

      this._assignColors(WCA.Store.senders);

      this.items = this._prepareItems(messages);
      this.container.innerHTML = '';
      this.renderedCount = 0;

      // Render initial chunk
      this.loadMoreData();
    },

    loadMoreData() {
      if (this.renderedCount >= this.items.length) return;
      this.isLoadingMore = true;

      const nextBatch = this.items.slice(this.renderedCount, this.renderedCount + this.BATCH_SIZE);
      const fragment = document.createDocumentFragment();

      for (const item of nextBatch) {
        fragment.appendChild(this._renderItem(item));
      }

      this.container.appendChild(fragment);
      this.renderedCount += nextBatch.length;
      this.isLoadingMore = false;
    },

    scrollToBottom() {
      if (!this.container) return;
      // Load all items if not yet rendered to ensure we reach true bottom
      while (this.renderedCount < this.items.length) {
        this.loadMoreData();
      }
      this.container.scrollTop = this.container.scrollHeight;
    },

    _prepareItems(messages) {
      const items = [];
      let lastDate = null;

      for (const msg of messages) {
        if (msg.timestamp) {
          const dateKey = msg.timestamp.toDateString();
          if (dateKey !== lastDate) {
            items.push({ type: 'separator', date: msg.timestamp });
            lastDate = dateKey;
          }
        }
        items.push({ type: 'message', message: msg });
      }

      return items;
    },

    _renderItem(item) {
      if (item.type === 'separator') {
        const el = document.createElement('div');
        el.className = 'date-separator';
        el.innerHTML = `<span class="date-separator-label">${WCA.DateUtils.formatSeparator(item.date)}</span>`;
        return el;
      }
      return this._renderMessage(item.message);
    },

    _renderMessage(msg) {
      const el = document.createElement('div');

      const isWhatsAppHeader = msg.text && msg.text.toLowerCase().includes('whatsapp chat with');

      if (msg.isSystem) {
        if (isWhatsAppHeader) {
          el.className = 'chat-message chat-message--received chat-message--header';
          el.innerHTML = `<div class="chat-bubble">📌 <strong>${this._escapeHtml(msg.text)}</strong></div>`;
        } else {
          el.className = 'chat-message chat-message--system';
          el.innerHTML = `<div class="chat-bubble">${this._escapeHtml(msg.text)}</div>`;
        }
        return el;
      }

      // Natural participant positioning:
      // First sender / Contact name from "WhatsApp Chat with <Contact>.txt" = Left side (received)
      // Second sender (Me / user) = Right side (sent)
      const senders = WCA.Store.senders || [];
      const senderIndex = senders.indexOf(msg.sender);

      let isSent = false;
      if (senders.length > 1) {
        isSent = senderIndex > 0;
      } else {
        isSent = false;
      }

      // If text contains header or matches chatTitle, keep left side
      if (isWhatsAppHeader) isSent = false;

      el.className = `chat-message ${isSent ? 'chat-message--sent' : 'chat-message--received'}`;

      let content = '';

      // Sender name
      content += `<span class="chat-sender">${this._escapeHtml(msg.sender || '')}</span>`;

      // Tags indicator badges (OTP, Sensitive, Location, etc.)
      if (msg.tags && msg.tags.length > 0) {
        const badges = [];
        if (msg.isOTP) badges.push('<span class="tag-badge tag-badge--otp">🔑 OTP</span>');
        if (msg.isSensitive) badges.push('<span class="tag-badge tag-badge--sensitive">🔒 Sensitive</span>');
        if (msg.isLiveLocation) badges.push('<span class="tag-badge tag-badge--location">📍 Live Location</span>');
        if (msg.isCoordinates) badges.push('<span class="tag-badge tag-badge--location">📍 Map Coordinates</span>');
        if (msg.isContact) badges.push('<span class="tag-badge tag-badge--contact">👤 Contact</span>');
        if (badges.length > 0) {
          content += `<div class="chat-tags-row">${badges.join(' ')}</div>`;
        }
      }

      // Forwarded tag
      if (msg.isForwarded) {
        content += `<div class="chat-forwarded-tag">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15,17 20,12 15,7"/><path d="M4 18v-2a4 4 0 014-4h12"/></svg>
          Forwarded
        </div>`;
      }

      // Media / File Attachments
      if (msg.mediaFile) {
        content += this._renderMedia(msg);
      } else if (msg.hasMedia) {
        const icon = WCA.Constants.FILE_ICONS[msg.mediaCategory] || '📎';
        content += `<div class="chat-media-placeholder"><span class="media-icon">${icon}</span><div class="media-info"><span class="media-name">${this._escapeHtml(msg.text || 'Media File')}</span><span class="media-size">File not in ZIP</span></div></div>`;
      }

      // Coordinates / Map Preview Card
      if (msg.isCoordinates) {
        const coords = msg.coordinates;
        content += `<div class="location-card">
          <div class="location-card-icon">📍</div>
          <div class="location-card-info">
            <strong>Location Coordinates</strong>
            <span>${this._escapeHtml(coords)}</span>
            <a href="https://maps.google.com/?q=${encodeURIComponent(coords)}" target="_blank" class="location-card-link">Open in Google Maps ↗</a>
          </div>
        </div>`;
      }

      // Live Location Card
      if (msg.isLiveLocation && !msg.isCoordinates) {
        content += `<div class="location-card location-card--live">
          <div class="location-card-icon">📡</div>
          <div class="location-card-info">
            <strong>Live Location Shared</strong>
            <span>Real-time tracking session</span>
          </div>
        </div>`;
      }

      // Sensitive / Password Masking Toggle
      if (msg.isSensitive) {
        content += `<div class="sensitive-mask" onclick="this.classList.toggle('revealed')">
          <span class="mask-notice">🔒 Sensitive Data — Click to Reveal</span>
          <div class="chat-text mask-content">${this._formatText(msg.text)}</div>
        </div>`;
      } else if (msg.text && (!msg.hasMedia || !WCA.Constants.REGEX.MEDIA_OMITTED.test(msg.text))) {
        // Text Content
        const textClass = msg.isDeleted ? 'chat-text chat-text--deleted' : 'chat-text';
        const displayText = msg.isEmojiOnly ? `<span class="emoji-only">${this._escapeHtml(msg.text)}</span>` : this._formatText(msg.text);
        content += `<div class="${textClass}">${displayText}</div>`;
      } else if (!msg.text && !msg.hasMedia) {
        // Empty message (Requirement: do not ignore)
        content += `<div class="chat-text chat-text--empty"><em>(Empty message)</em></div>`;
      }

      // Timestamp, edited tag, and double checkmarks
      const timeStr = msg.timestamp ? WCA.Formatters.time(msg.timestamp) : '';
      const checkmark = isSent ? '<span class="chat-checkmark">✓✓</span>' : '';
      content += `<div class="chat-time">${msg.isEdited ? '<span class="chat-edited-tag">edited</span>' : ''}${timeStr}${checkmark}</div>`;

      el.innerHTML = `<div class="chat-bubble">${content}</div>`;

      // Audio player binding if audio container present
      const audioPlaceholder = el.querySelector('.chat-audio-player-placeholder');
      if (audioPlaceholder && msg.mediaFile) {
        const player = WCA.AudioPlayer.create(msg.mediaFile.url, WCA.Formatters.fileSize(msg.mediaFile.size), msg.mediaFile.name);
        audioPlaceholder.replaceWith(player);
      }

      // Image click handler for lightbox
      const mediaImg = el.querySelector('.chat-media img');
      if (mediaImg && msg.mediaFile) {
        mediaImg.addEventListener('click', () => {
          const images = WCA.Store.mediaFiles.filter(f => f.category === 'images');
          const index = images.indexOf(msg.mediaFile);
          WCA.Lightbox.open(images.map(f => ({
            url: f.url, type: 'image', name: f.name, sender: f.sender, category: f.category
          })), Math.max(0, index));
        });
      }

      return el;
    },

    _renderMedia(msg) {
      const file = msg.mediaFile;
      if (!file) return '';

      switch (file.category) {
        case 'images':
          return `<div class="chat-media"><img src="${file.url}" alt="${this._escapeHtml(file.name)}" loading="lazy"></div>`;

        case 'videos':
          return `<div class="chat-media"><video src="${file.url}" controls preload="metadata"></video></div>`;

        case 'audio':
          return `<div class="chat-media"><div class="chat-audio-player-placeholder"></div></div>`;

        default:
          const icon = WCA.Constants.FILE_ICONS[file.category] || WCA.Constants.FILE_ICONS.other;
          return `<div class="chat-media-placeholder">
            <span class="media-icon">${icon}</span>
            <div class="media-info">
              <span class="media-name">${this._escapeHtml(file.name)}</span>
              <span class="media-size">${WCA.Formatters.fileSize(file.size)} · ${file.ext?.toUpperCase() || ''}</span>
            </div>
            <a href="${file.url}" download="${file.name}" class="btn-download" title="Download File">⬇️</a>
          </div>`;
      }
    },

    _formatText(text) {
      if (!text) return '';
      let html = this._escapeHtml(text);

      // Convert URLs to clickable links with favicons
      html = html.replace(
        /(?:https?:\/\/|www\.)[^\s<>\u200E"]+/gi,
        (url) => {
          const href = url.startsWith('http') ? url : `http://${url}`;
          try {
            const domain = new URL(href).hostname;
            const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link"><img src="${favicon}" class="link-favicon" alt="" onerror="this.style.display='none'">${this._escapeHtml(url)}</a>`;
          } catch (e) {
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">${this._escapeHtml(url)}</a>`;
          }
        }
      );

      // Phone numbers to tel: links
      html = html.replace(
        /(?:\+|\b)(?:\d{1,3}[\s-]?)?\(?\d{2,5}\)?[\s-]?\d{3,5}[\s-]?\d{3,5}\b/g,
        (phone) => `<a href="tel:${phone.replace(/\s+/g, '')}" class="chat-phone">📞 ${phone}</a>`
      );

      // Email addresses to mailto: links
      html = html.replace(
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        (email) => `<a href="mailto:${email}" class="chat-email">✉️ ${email}</a>`
      );

      // Formatting: *bold*, _italic_, ```code```
      html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
      html = html.replace(/\b_([^_]+)_\b/g, '<em>$1</em>');
      html = html.replace(/```([^`]+)```/g, '<code>$1</code>');

      return html;
    },

    _assignColors(senders) {
      this.senderColors.clear();
      senders.forEach((sender, i) => {
        this.senderColors.set(sender, WCA.Constants.CHART_COLORS.senders[i % WCA.Constants.CHART_COLORS.senders.length]);
      });
    },

    scrollToDate(date) {
      const messages = WCA.Store.filteredMessages;
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].timestamp && messages[i].timestamp >= date) {
          while (this.renderedCount <= i && this.renderedCount < this.items.length) {
            this.loadMoreData();
          }
          const children = this.container.children;
          if (children[i]) {
            children[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return;
        }
      }
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }
  };
})();

