/**
 * content.js — Main content script. Wires transcript, player, speech, scoring, and UI together.
 */

(() => {
  // State
  let sentences = [];
  let language = 'en-US';
  let currentIndex = 0;
  let isActive = false;
  let scores = [];

  /**
   * Initialize: create UI overlay, show start screen.
   */
  function init() {
    // Prevent double-init
    if (document.getElementById('shadow-talk-overlay')) return;

    ShadowUI.create();
    ShadowUI.renderStart(startShadowing);
  }

  /**
   * Start the shadowing session.
   * @param {string} [selectedLang] - Language code from the UI selector (e.g. 'en-US')
   */
  async function startShadowing(selectedLang) {
    ShadowUI.renderLoading();

    try {
      const result = await ShadowTranscript.getTranscript();
      sentences = result.sentences;
      // Use user-selected language for speech recognition, fall back to transcript language
      language = selectedLang || ShadowSpeech.mapLanguage(result.language);
      currentIndex = 0;
      scores = [];
      isActive = true;

      playSentence(currentIndex);
    } catch (err) {
      console.error('[ShadowTalk]', err);
      ShadowUI.renderError(err.message, startShadowing);
    }
  }

  /**
   * Play video from current sentence start, pause at sentence end.
   */
  function playSentence(index) {
    if (!isActive || index >= sentences.length) {
      finishSession();
      return;
    }

    const sentence = sentences[index];
    currentIndex = index;

    ShadowUI.renderPlaying(sentence, index, sentences.length, stopShadowing);

    // Seek to sentence start and play
    ShadowPlayer.seekTo(sentence.startTime);
    ShadowPlayer.play();

    // Watch for sentence end — then pause and prompt user
    ShadowPlayer.watchForTime(sentence.endTime, () => {
      promptUser(index);
    });
  }

  /**
   * Video has paused at sentence end. Now prompt user to speak.
   */
  function promptUser(index) {
    if (!isActive) return;

    const sentence = sentences[index];

    ShadowUI.renderListening(sentence, index, sentences.length, {
      onStop: stopShadowing,
      onDone: () => ShadowSpeech.stop(),
      onReplay: () => replaySentence(index),
      onSkip: () => skipSentence(index),
    });

    ShadowRecorder.startRecording();

    ShadowSpeech.listen(language, 20000, 2000, (liveText) => {
      const liveEl = document.querySelector('.st-live-text');
      if (liveEl) liveEl.textContent = liveText;
    })
      .then(async (result) => {
        if (!isActive) return;
        const recordingUrl = await ShadowRecorder.stopRecording();
        showScore(index, result.transcript, recordingUrl);
      })
      .catch(async (err) => {
        console.error('[ShadowTalk] Speech error:', err);
        if (!isActive) return;
        const recordingUrl = await ShadowRecorder.stopRecording();
        showScore(index, '', recordingUrl);
      });
  }

  /**
   * Show the scoring result.
   */
  function showScore(index, userTranscript, recordingUrl) {
    if (!isActive) return;

    const sentence = sentences[index];
    const result = ShadowScoring.score(sentence.text, userTranscript);

    scores.push(result.score);

    ShadowUI.renderScore(result, sentence, index, sentences.length, {
      onStop: stopShadowing,
      onReplay: () => replaySentence(index),
      onRetry: () => retrySentence(index),
      onContinue: () => nextSentence(index),
      onPlayOriginal: () => {
        ShadowRecorder.stopPlayback();
        ShadowPlayer.seekTo(sentence.startTime);
        ShadowPlayer.play();
      },
      onPlayRecording: () => {
        ShadowPlayer.pause();
        ShadowPlayer.stopWatching();
      },
    }, recordingUrl);
  }

  /**
   * Replay the current sentence (seek back and play again).
   */
  function replaySentence(index) {
    ShadowSpeech.abort();
    ShadowRecorder.cleanup();
    const sentence = sentences[index];
    ShadowPlayer.seekTo(sentence.startTime);
    ShadowPlayer.play();
    ShadowPlayer.watchForTime(sentence.endTime, () => {
      promptUser(index);
    });
    ShadowUI.renderPlaying(sentence, index, sentences.length, stopShadowing);
  }

  /**
   * Retry speaking the same sentence (don't replay video).
   */
  function retrySentence(index) {
    if (scores.length > 0) scores.pop();
    ShadowRecorder.cleanup();
    promptUser(index);
  }

  /**
   * Skip to next sentence.
   */
  function skipSentence(index) {
    ShadowSpeech.abort();
    ShadowRecorder.cleanup();
    scores.push(0);
    nextSentence(index);
  }

  /**
   * Move to the next sentence.
   */
  function nextSentence(index) {
    ShadowSpeech.abort();
    ShadowRecorder.cleanup();
    const next = index + 1;
    if (next >= sentences.length) {
      finishSession();
    } else {
      playSentence(next);
    }
  }

  /**
   * End the shadowing session — show summary.
   */
  function finishSession() {
    isActive = false;
    ShadowPlayer.stopWatching();
    ShadowSpeech.abort();
    ShadowRecorder.releaseStream();
    ShadowPlayer.pause();

    const avg =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    ShadowUI.renderComplete(
      { averageScore: avg, totalSentences: scores.length },
      () => {
        currentIndex = 0;
        scores = [];
        isActive = true;
        playSentence(0);
      },
      () => {
        ShadowUI.hide();
      }
    );
  }

  /**
   * Stop shadowing entirely.
   */
  function stopShadowing() {
    isActive = false;
    ShadowPlayer.stopWatching();
    ShadowSpeech.abort();
    ShadowRecorder.releaseStream();
    ShadowPlayer.pause();
    ShadowUI.renderStart(startShadowing);
  }

  /**
   * Listen for messages from popup or background.
   */
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'toggle') {
      const overlay = document.getElementById('shadow-talk-overlay');
      if (overlay && !overlay.classList.contains('st-hidden')) {
        ShadowUI.hide();
        if (isActive) stopShadowing();
      } else {
        init();
        ShadowUI.show();
      }
      sendResponse({ ok: true });
    }

    if (msg.action === 'getState') {
      sendResponse({
        isActive,
        hasOverlay: !!document.getElementById('shadow-talk-overlay'),
      });
    }
  });

  // Handle YouTube SPA navigation — re-init when the URL changes
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Clean up old session
      if (isActive) stopShadowing();
      ShadowUI.destroy();
      ShadowPlayer.destroy();
      ShadowRecorder.releaseStream();
      // Re-init after a short delay (wait for new page to load)
      setTimeout(() => {
        if (location.href.includes('youtube.com/watch')) {
          init();
        }
      }, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial load
  if (location.href.includes('youtube.com/watch')) {
    // Wait for video element to be available
    const waitForVideo = setInterval(() => {
      if (document.querySelector('video')) {
        clearInterval(waitForVideo);
        init();
      }
    }, 500);

    // Safety: stop waiting after 10 seconds
    setTimeout(() => clearInterval(waitForVideo), 10000);
  }
})();
