// Core extension functionality
const extensionCore = {
  isActive: true,

  checkContext() {
    try {
      chrome.runtime.getURL("");
      this.isActive = true;
      return true;
    } catch (e) {
      this.isActive = false;
      console.error("Extension context invalidated:", e);
      return false;
    }
  },

  safeStorageGet(defaults, callback) {
    if (!this.checkContext()) {
      callback(defaults);
      return;
    }

    try {
      chrome.storage.sync.get(defaults, callback);
    } catch (e) {
      console.error("Failed to access Chrome storage:", e);
      callback(defaults);
    }
  },

  init() {
    if (!this.checkContext()) {
      console.error("Extension context is invalid at initialization");
      return false;
    }

    // Re-check context periodically
    setInterval(() => this.checkContext(), 5000);
    return true;
  }
};

export default extensionCore;