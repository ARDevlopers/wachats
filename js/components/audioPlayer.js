/* ============================================================
   ChatLens Audio Player
   Custom styled audio player for chat messages and media gallery
   ============================================================ */

(function() {
  'use strict';
  const WCA = window.WCA = window.WCA || {};

  WCA.AudioPlayer = {
    _activeAudio: null,
    _activeResetFn: null,

    /**
     * Stop any currently playing audio across the app
     */
    stopAll() {
      if (this._activeAudio) {
        try {
          this._activeAudio.pause();
          this._activeAudio.currentTime = 0;
        } catch (e) {}
        this._activeAudio = null;
      }
      if (typeof this._activeResetFn === 'function') {
        try { this._activeResetFn(); } catch (e) {}
        this._activeResetFn = null;
      }
    },

    /**
     * Create a full-featured audio player element
     * @param {string} src - Audio source URL
     * @param {string} initialDuration - Optional fallback duration text
     * @param {string} name - Optional audio file name
     * @returns {HTMLElement}
     */
    create(src, initialDuration, name) {
      const el = document.createElement('div');
      el.className = 'chat-audio-player';

      const playSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
      const pauseSvg = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      const volumeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
      const muteSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M23 9l-6 6M17 9l6 6"/></svg>';

      el.innerHTML = `
        <button class="audio-play-btn" aria-label="Play">${playSvg}</button>
        <div class="audio-body">
          ${name ? `<div class="audio-title">${this._escapeHtml(name)}</div>` : ''}
          <div class="audio-progress-bar">
            <div class="audio-progress-fill"></div>
          </div>
          <div class="audio-time-row">
            <span class="audio-time-current">0:00</span>
            <span class="audio-time-total">${initialDuration || '0:00'}</span>
          </div>
        </div>
        <div class="audio-controls">
          <button class="audio-speed-btn" title="Playback Speed">1x</button>
          <button class="audio-mute-btn" title="Mute/Unmute">${volumeSvg}</button>
        </div>
      `;

      const audio = new Audio(src);
      const playBtn = el.querySelector('.audio-play-btn');
      const progressBar = el.querySelector('.audio-progress-bar');
      const progressFill = el.querySelector('.audio-progress-fill');
      const timeCurrent = el.querySelector('.audio-time-current');
      const timeTotal = el.querySelector('.audio-time-total');
      const speedBtn = el.querySelector('.audio-speed-btn');
      const muteBtn = el.querySelector('.audio-mute-btn');

      const speeds = [1, 1.5, 2];
      let speedIdx = 0;

      const formatTime = (s) => {
        if (isNaN(s) || !isFinite(s) || s < 0) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
      };

      const resetUI = () => {
        playBtn.innerHTML = playSvg;
        progressFill.style.width = '0%';
        if (audio.duration) {
          timeCurrent.textContent = '0:00';
          timeTotal.textContent = formatTime(audio.duration);
        }
      };

      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (audio.paused) {
          WCA.AudioPlayer.stopAll();
          audio.play().then(() => {
            WCA.AudioPlayer._activeAudio = audio;
            WCA.AudioPlayer._activeResetFn = resetUI;
            playBtn.innerHTML = pauseSvg;
          }).catch(err => console.error('Audio play error:', err));
        } else {
          audio.pause();
          playBtn.innerHTML = playSvg;
          if (WCA.AudioPlayer._activeAudio === audio) {
            WCA.AudioPlayer._activeAudio = null;
            WCA.AudioPlayer._activeResetFn = null;
          }
        }
      });

      audio.addEventListener('timeupdate', () => {
        if (audio.duration) {
          const pct = (audio.currentTime / audio.duration) * 100;
          progressFill.style.width = pct + '%';
          timeCurrent.textContent = formatTime(audio.currentTime);
          timeTotal.textContent = formatTime(audio.duration);
        }
      });

      audio.addEventListener('ended', () => {
        resetUI();
        if (WCA.AudioPlayer._activeAudio === audio) {
          WCA.AudioPlayer._activeAudio = null;
          WCA.AudioPlayer._activeResetFn = null;
        }
      });

      audio.addEventListener('loadedmetadata', () => {
        timeTotal.textContent = formatTime(audio.duration);
      });

      progressBar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = pct * audio.duration;
      });

      speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speedIdx = (speedIdx + 1) % speeds.length;
        const speed = speeds[speedIdx];
        audio.playbackRate = speed;
        speedBtn.textContent = `${speed}x`;
      });

      muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.muted = !audio.muted;
        muteBtn.innerHTML = audio.muted ? muteSvg : volumeSvg;
      });

      return el;
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text || '';
      return div.innerHTML;
    }
  };
})();

