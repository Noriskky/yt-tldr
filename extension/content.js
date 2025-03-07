// Main content script - imports all modules
import extensionCore from './src/core.js';
import youtubeInterface from './src/youtube.js';
import uiManager from './src/ui.js';
import markdownHelper from './src/markdown.js';
import apiService from './src/api.js';

// App state
const state = {
  currentVideoId: null
};

// Check if current page is a video and setup accordingly
function checkForVideoPage() {
  const videoId = youtubeInterface.getVideoId(window.location.href);

  if (videoId) {
    // Check if video ID has changed
    if (videoId !== state.currentVideoId) {
      // Reset summary container if video changed
      uiManager.hideContainer();
      state.currentVideoId = videoId;
    }

    // Give time for YouTube to load its UI
    setTimeout(() => uiManager.insertSummaryElements(requestSummary), 1000);
  } else if (state.currentVideoId) {
    // Reset if we've navigated away from a video page
    state.currentVideoId = null;
    uiManager.hideContainer();
  }
}

// Request summary wrapper function
function requestSummary() {
  apiService.requestSummary(state.currentVideoId, extensionCore, uiManager, markdownHelper);
}

// Initialize the extension
function init() {
  if (!extensionCore.init()) return;

  // Bind functions to ensure proper this context
  checkForVideoPage = checkForVideoPage.bind(this);

  // Start monitoring for YouTube navigation
  youtubeInterface.setupNavigationMonitor(checkForVideoPage);
}

// Start the extension
init();