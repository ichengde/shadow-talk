/**
 * ui.js — Overlay panel rendering for Shadow Talk.
 */

const ShadowUI = (() => {
  let overlay = null;

  /**
   * Create the overlay element and inject it into the page.
   */
  function create() {
    if (overlay && document.contains(overlay)) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'shadow-talk-overlay';
    overlay.classList.add('st-hidden');
    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Show the overlay.
   */
  function show() {
    if (!overlay) create();
    overlay.classList.remove('st-hidden');
  }

  /**
   * Hide the overlay.
   */
  function hide() {
    if (overlay) overlay.classList.add('st-hidden');
  }

  /**
   * Remove the overlay from the DOM entirely.
   */
  function destroy() {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    overlay = null;
  }

  /**
   * Render the start screen (before shadowing begins).
   */
  function renderStart(onStart) {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <button class="st-close-btn" data-action="close">&times;</button>
      </div>
      <div class="st-body">
        <div class="st-start">
          <div class="st-start-text">
            Practice speaking by shadowing this video sentence by sentence.
          </div>
          <div style="margin-bottom: 12px;">
            <label class="st-sentence-label" for="st-lang-select">Language</label>
            <select id="st-lang-select" class="st-select">
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="it-IT">Italian</option>
              <option value="pt-BR">Portuguese (BR)</option>
              <option value="pt-PT">Portuguese (PT)</option>
              <option value="nl-NL">Dutch</option>
              <option value="ru-RU">Russian</option>
              <option value="ja-JP">Japanese</option>
              <option value="ko-KR">Korean</option>
              <option value="zh-CN">Chinese (Simplified)</option>
              <option value="zh-TW">Chinese (Traditional)</option>
              <option value="ar-SA">Arabic</option>
              <option value="hi-IN">Hindi</option>
              <option value="tr-TR">Turkish</option>
              <option value="pl-PL">Polish</option>
              <option value="sv-SE">Swedish</option>
              <option value="fa-IR">Persian (Farsi)</option>
            </select>
          </div>
          <button class="st-btn st-btn-primary" data-action="start" style="width: 100%;">
            Start Shadowing
          </button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="start"]').onclick = () => {
      const lang = overlay.querySelector('#st-lang-select').value;
      onStart(lang);
    };
    overlay.querySelector('[data-action="close"]').onclick = () => hide();
  }

  /**
   * Render loading state.
   */
  function renderLoading() {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <button class="st-close-btn" data-action="close">&times;</button>
      </div>
      <div class="st-body">
        <div class="st-status">
          <span class="st-status-dot st-playing"></span>
          Loading transcript...
        </div>
      </div>
    `;
    overlay.querySelector('[data-action="close"]').onclick = () => hide();
  }

  /**
   * Render error state.
   */
  function renderError(message, onRetry) {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <button class="st-close-btn" data-action="close">&times;</button>
      </div>
      <div class="st-body">
        <div class="st-error">${_escapeHtml(message)}</div>
        <div class="st-buttons">
          <button class="st-btn st-btn-secondary" data-action="close-panel">Close</button>
          ${onRetry ? '<button class="st-btn st-btn-primary" data-action="retry">Retry</button>' : ''}
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="close"]').onclick = () => hide();
    overlay.querySelector('[data-action="close-panel"]').onclick = () => hide();
    if (onRetry) {
      overlay.querySelector('[data-action="retry"]').onclick = onRetry;
    }
  }

  /**
   * Render the "playing" state — video is playing, waiting for sentence end.
   */
  function renderPlaying(sentence, sentenceIndex, totalSentences, onStop) {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <span class="st-header-info">${sentenceIndex + 1} / ${totalSentences}</span>
        <button class="st-close-btn" data-action="stop">&times;</button>
      </div>
      <div class="st-body">
        ${_renderProgress(sentenceIndex, totalSentences)}
        <div class="st-status">
          <span class="st-status-dot st-playing"></span>
          Listening to sentence...
        </div>
        <div class="st-sentence">
          <div class="st-sentence-label">Upcoming</div>
          <div class="st-sentence-text">${_escapeHtml(sentence.text)}</div>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="stop"]').onclick = onStop;
  }

  /**
   * Render the "your turn" state — video paused, waiting for user to speak.
   */
  function renderListening(sentence, sentenceIndex, totalSentences, callbacks) {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <span class="st-header-info">${sentenceIndex + 1} / ${totalSentences}</span>
        <button class="st-close-btn" data-action="stop">&times;</button>
      </div>
      <div class="st-body">
        ${_renderProgress(sentenceIndex, totalSentences)}
        <div class="st-sentence">
          <div class="st-sentence-label">Repeat this sentence</div>
          <div class="st-sentence-text">${_escapeHtml(sentence.text)}</div>
        </div>
        <div class="st-mic">
          <span class="st-mic-icon">&#127908;</span>
          Listening... Speak now!
        </div>
        <div class="st-sentence">
          <div class="st-sentence-label">You're saying</div>
          <div class="st-sentence-text st-live-text" style="color: #888; font-style: italic;">...</div>
        </div>
        <div class="st-buttons">
          <button class="st-btn st-btn-primary" data-action="done">Done</button>
          <button class="st-btn st-btn-secondary" data-action="replay">Replay</button>
          <button class="st-btn st-btn-secondary" data-action="skip">Skip</button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="stop"]').onclick = callbacks.onStop;
    overlay.querySelector('[data-action="done"]').onclick = callbacks.onDone;
    overlay.querySelector('[data-action="replay"]').onclick = callbacks.onReplay;
    overlay.querySelector('[data-action="skip"]').onclick = callbacks.onSkip;
  }

  /**
   * Render the score result after user speaks.
   */
  function renderScore(result, sentence, sentenceIndex, totalSentences, callbacks, recordingUrl) {
    const scoreClass =
      result.score >= 80 ? 'st-score-great' :
      result.score >= 50 ? 'st-score-good' : 'st-score-poor';

    const scoreLabel =
      result.score >= 80 ? 'Great job!' :
      result.score >= 50 ? 'Good effort!' : 'Try again!';

    const hasRecording = !!recordingUrl;

    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <span class="st-header-info">${sentenceIndex + 1} / ${totalSentences}</span>
        <button class="st-close-btn" data-action="stop">&times;</button>
      </div>
      <div class="st-body">
        ${_renderProgress(sentenceIndex + 1, totalSentences)}
        <div class="st-score">
          <div class="st-score-number ${scoreClass}">${result.score}%</div>
          <div class="st-score-label">${scoreLabel} (${result.matchedCount}/${result.totalCount} words)</div>
        </div>
        <div class="st-sentence">
          <div class="st-sentence-label">Original</div>
          <div class="st-sentence-text">${_renderWordDiff(result.words)}</div>
        </div>
        <div class="st-sentence">
          <div class="st-sentence-label">You said</div>
          <div class="st-sentence-text">${_renderUserWords(result.userWords)}</div>
        </div>
        <div class="st-compare">
          <div class="st-compare-label">Compare</div>
          <div class="st-compare-buttons">
            <button class="st-btn st-btn-compare" data-action="play-original">&#9654; Original</button>
            <button class="st-btn st-btn-compare" data-action="play-recording" ${hasRecording ? '' : 'disabled'}>&#9654; My Recording</button>
          </div>
        </div>
        <div class="st-buttons">
          <button class="st-btn st-btn-secondary" data-action="retry">Retry</button>
          <button class="st-btn st-btn-primary" data-action="continue">Continue</button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="stop"]').onclick = callbacks.onStop;
    overlay.querySelector('[data-action="retry"]').onclick = callbacks.onRetry;
    overlay.querySelector('[data-action="continue"]').onclick = callbacks.onContinue;

    const origBtn = overlay.querySelector('[data-action="play-original"]');
    const recBtn = overlay.querySelector('[data-action="play-recording"]');
    let playingOriginal = false;

    origBtn.onclick = () => {
      if (playingOriginal) {
        ShadowPlayer.pause();
        ShadowPlayer.stopWatching();
        origBtn.innerHTML = '&#9654; Original';
        playingOriginal = false;
        return;
      }
      // Stop the other playback first
      ShadowRecorder.stopPlayback();
      recBtn.innerHTML = '&#9654; My Recording';

      origBtn.innerHTML = '&#9632; Stop';
      playingOriginal = true;
      callbacks.onPlayOriginal();
      ShadowPlayer.watchForTime(sentence.endTime, () => {
        origBtn.innerHTML = '&#9654; Original';
        playingOriginal = false;
      });
    };

    if (hasRecording) {
      let playingRec = false;
      recBtn.onclick = () => {
        if (playingRec) {
          ShadowRecorder.stopPlayback();
          recBtn.innerHTML = '&#9654; My Recording';
          playingRec = false;
          return;
        }
        // Stop the other playback first
        if (playingOriginal) {
          ShadowPlayer.pause();
          ShadowPlayer.stopWatching();
          origBtn.innerHTML = '&#9654; Original';
          playingOriginal = false;
        }

        recBtn.innerHTML = '&#9632; Stop';
        playingRec = true;
        callbacks.onPlayRecording();
        ShadowRecorder.playRecording()
          .then(() => {
            recBtn.innerHTML = '&#9654; My Recording';
            playingRec = false;
          })
          .catch(() => {
            recBtn.innerHTML = '&#9654; My Recording';
            playingRec = false;
          });
      };
    }
  }

  /**
   * Render completion screen.
   */
  function renderComplete(stats, onRestart, onClose) {
    show();
    overlay.innerHTML = `
      <div class="st-header">
        <span class="st-header-title">Shadow Talk</span>
        <button class="st-close-btn" data-action="close">&times;</button>
      </div>
      <div class="st-body">
        <div class="st-score">
          <div class="st-score-number st-score-great">${stats.averageScore}%</div>
          <div class="st-score-label">Average Score — ${stats.totalSentences} sentences completed</div>
        </div>
        <div class="st-buttons">
          <button class="st-btn st-btn-secondary" data-action="close-panel">Close</button>
          <button class="st-btn st-btn-primary" data-action="restart">Restart</button>
        </div>
      </div>
    `;

    overlay.querySelector('[data-action="close"]').onclick = onClose || (() => hide());
    overlay.querySelector('[data-action="close-panel"]').onclick = onClose || (() => hide());
    overlay.querySelector('[data-action="restart"]').onclick = onRestart;
  }

  // ---- Private helpers ----

  function _renderProgress(current, total) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    return `
      <div class="st-progress">
        <div class="st-progress-bar">
          <div class="st-progress-fill" style="width: ${pct}%"></div>
        </div>
        <span class="st-progress-text">${pct}%</span>
      </div>
    `;
  }

  function _renderWordDiff(words) {
    return words
      .map((w) => `<span class="st-word-${w.status}">${_escapeHtml(w.word)}</span>`)
      .join(' ');
  }

  function _renderUserWords(words) {
    if (!words || words.length === 0) return '<span class="st-word-missed">(no speech detected)</span>';
    return words
      .map((w) => `<span class="st-word-${w.status}">${_escapeHtml(w.word)}</span>`)
      .join(' ');
  }

  function _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    create,
    show,
    hide,
    destroy,
    renderStart,
    renderLoading,
    renderError,
    renderPlaying,
    renderListening,
    renderScore,
    renderComplete,
  };
})();
