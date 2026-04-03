# Privacy Policy — Shadow Talk

**Last updated:** February 27, 2026

## Overview

Shadow Talk is a browser extension that helps users practice speaking by shadowing YouTube videos. This privacy policy explains what data the extension accesses and how it is handled.

## Data Collection

**Shadow Talk does not collect, store, transmit, or share any personal data.**

## What the Extension Accesses

The extension accesses the following data, all of which stays entirely on your device:

### YouTube Page Content
- The extension reads caption/transcript data from YouTube video pages to display sentences for shadowing practice.
- This data is read directly from the YouTube page you are viewing and is not sent anywhere.

### Speech Recognition
- The extension uses the Web Speech API built into your browser (Chrome) to recognize your speech during practice sessions.
- Speech audio is processed by your browser's built-in speech recognition engine.
- Note: Chrome's Web Speech API may send audio to Google's servers for processing. This is a browser-level behavior controlled by Google, not by this extension. See [Google's Privacy Policy](https://policies.google.com/privacy) for details.

### Voice Recording Playback
- During practice, the extension records your voice so you can play it back and compare with the original video audio.
- Recordings are held in browser memory only and are discarded when you move to the next sentence or close the panel.
- No audio is saved to disk, stored, or transmitted.

### Local Storage
- The extension uses Chrome's local storage (`chrome.storage.local`) to save user preferences such as selected language.
- This data never leaves your device.

## Permissions Explained

| Permission | Why It's Needed |
|-----------|----------------|
| `activeTab` | To interact with the YouTube page when you click the extension icon |
| `storage` | To save your language preference locally |
| `host_permissions: youtube.com` | To inject the shadowing interface on YouTube video pages |

## Third-Party Services

Shadow Talk does not use any third-party analytics, tracking, advertising, or data collection services.

## Data Sharing

Shadow Talk does not share any data with anyone. There is no server, no backend, and no external API calls made by the extension.

## Changes to This Policy

If this privacy policy is updated, the changes will be reflected in the extension's source code repository and the "Last updated" date above will be changed.

## Contact

If you have questions about this privacy policy, please open an issue on the project's GitHub repository.

## Open Source

Shadow Talk is open source. You can inspect the complete source code to verify these privacy claims.
