/**
 * recorder.js — Record user speech via MediaRecorder for A/B playback.
 *
 * Runs alongside Web Speech API recognition. The mic stream is obtained
 * once per session and reused so the user only sees one permission prompt.
 * Recordings live in memory only — never saved to disk or transmitted.
 */

const ShadowRecorder = (() => {
  let stream = null;
  let mediaRecorder = null;
  let chunks = [];
  let recordingUrl = null;
  let audioEl = null;

  /**
   * Acquire the mic stream (once per session).
   */
  async function _ensureStream() {
    if (stream && stream.active) return stream;
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return stream;
  }

  /**
   * Start recording from the mic.
   * Resolves when MediaRecorder is actively capturing.
   */
  async function startRecording() {
    try {
      cleanup();
      const s = await _ensureStream();

      chunks = [];
      mediaRecorder = new MediaRecorder(s, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.start();
    } catch (err) {
      console.warn('[ShadowTalk Recorder] Could not start recording:', err.message);
      mediaRecorder = null;
    }
  }

  /**
   * Stop recording and return the blob URL (or null on failure).
   */
  function stopRecording() {
    return new Promise((resolve) => {
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        if (chunks.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        recordingUrl = URL.createObjectURL(blob);
        chunks = [];
        resolve(recordingUrl);
      };

      mediaRecorder.stop();
    });
  }

  /**
   * Play the last recording. Returns a Promise that resolves when playback ends.
   */
  function playRecording() {
    return new Promise((resolve, reject) => {
      if (!recordingUrl) {
        reject(new Error('No recording available'));
        return;
      }
      stopPlayback();
      audioEl = new Audio(recordingUrl);
      audioEl.onended = () => resolve();
      audioEl.onerror = (e) => reject(e);
      audioEl.play();
    });
  }

  /**
   * Stop any in-progress playback.
   */
  function stopPlayback() {
    if (audioEl) {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl = null;
    }
  }

  /**
   * Free the current recording blob URL (call between sentences).
   */
  function cleanup() {
    stopPlayback();
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
      recordingUrl = null;
    }
    chunks = [];
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
    }
    mediaRecorder = null;
  }

  /**
   * Release the mic stream entirely (call on session end).
   */
  function releaseStream() {
    cleanup();
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  function hasRecording() {
    return !!recordingUrl;
  }

  return { startRecording, stopRecording, playRecording, stopPlayback, cleanup, releaseStream, hasRecording };
})();
