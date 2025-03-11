// Main content script - imports all modules
import extensionCore from './src/core.js';
import youtubeInterface from './src/youtube.js';
import uiManager from './src/ui.js';
import markdownHelper from './src/markdown.js';
import apiService from './src/api.js';

const state = {
  currentVideoId: null
};

function checkForVideoPage() {
  const videoId = youtubeInterface.getVideoId(window.location.href);

  if (videoId) {
    if (videoId !== state.currentVideoId) {
      uiManager.hideContainer();
      state.currentVideoId = videoId;
    }

    setTimeout(() => uiManager.insertSummaryElements(requestSummary), 1000);
  } else if (state.currentVideoId) {
    state.currentVideoId = null;
    uiManager.hideContainer();
  }
}

function requestSummary() {
  apiService.requestSummary(state.currentVideoId, extensionCore, uiManager, markdownHelper);
}

function init() {
  if (!extensionCore.init()) return;

  checkForVideoPage = checkForVideoPage.bind(this);

  youtubeInterface.setupNavigationMonitor(checkForVideoPage);
}

init();