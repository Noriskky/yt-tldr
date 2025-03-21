// API interactions
const apiService = {
  config: {
    defaultApiUrl: 'http://localhost:8000/summarize',
    defaultModel: 'llama3.2:latest',
    defaultLength: 'short',
    defaultOllamaModel: 'llama3.2:latest'  // Default without prefix
  },

  async requestSummary(videoId, extensionCore, uiManager, markdownHelper) {
    if (!videoId || !extensionCore.isActive) {
      console.error('Invalid extension context or missing video ID');
      return;
    }

    uiManager.showLoading();

    try {
      extensionCore.safeStorageGet({
        apiUrl: this.config.defaultApiUrl,
        model: this.config.defaultModel,
        length: this.config.defaultLength,
        ollamaModel: this.config.defaultOllamaModel
      }, async (settings) => {
        if (!extensionCore.isActive) {
          uiManager.displayError("Extension context was invalidated. Please refresh the page and try again.");
          return;
        }

        let cleanmodel = settings.model;
        if (settings.model === 'ollama') {
          // Add ollama: prefix if not already present
          cleanmodel = settings.ollamaModel.startsWith('ollama:') ?
              settings.ollamaModel :
              `ollama:${settings.ollamaModel}`;
        }

        try {
          console.log('Sending request to:', settings.apiUrl, {
            videoId: videoId,
            model: cleanmodel,
            length: settings.length
          });

          const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            mode: 'cors',
            body: JSON.stringify({
              videoId: videoId,
              model: cleanmodel,
              length: settings.length
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMsg = errorData?.message || `Server returned ${response.status}`;
            throw new Error(errorMsg);
          }

          const data = await response.json();
          if (data && data.summary) {
            uiManager.displaySummary(data.summary, markdownHelper);
          } else {
            throw new Error("No summary was returned from the server");
          }
        } catch (error) {
          console.error('Summary request failed:', error);
          uiManager.displayError(error.message || "Failed to generate summary");
        }
      });
    } catch (error) {
      console.error('Request error:', error);
      uiManager.displayError("Failed to generate summary: " + error.message);
    }
  }
};

export default apiService;