// UI Management
const uiManager = {
    summaryContainer: null,
    insertSelectors: [
        '#below', '#info-contents', '#above-the-fold',
        '#bottom-row', '#meta', '#primary-inner'
    ],

    insertSummaryElements(requestSummaryCallback) {
        if (document.getElementById('yt-tldr-btn')) {
            return;
        }

        const summaryButton = document.createElement('button');
        summaryButton.id = 'yt-tldr-btn';
        summaryButton.className = 'yt-tldr-button';
        summaryButton.textContent = 'TL;DR Summary';
        summaryButton.onclick = requestSummaryCallback;

        this.summaryContainer = document.createElement('div');
        this.summaryContainer.id = 'yt-tldr-container';
        this.summaryContainer.className = 'yt-tldr-summary-container';
        this.summaryContainer.style.display = 'none';

        let inserted = this.tryInsertAtSelectors([summaryButton, this.summaryContainer]);

        if (!inserted) {
            inserted = this.tryInsertAfterTitle([summaryButton, this.summaryContainer]);
        }

        if (!inserted) {
            console.error('TL;DR: Could not find a suitable location to insert the button');
        }
    },

    tryInsertAtSelectors(elements) {
        for (const selector of this.insertSelectors) {
            const insertTarget = document.querySelector(selector);
            if (insertTarget) {
                try {
                    elements.forEach(el => insertTarget.prepend(el));
                    console.log('TL;DR: Inserted at', selector);
                    return true;
                } catch (e) {
                    console.error('Failed to insert at', selector, e);
                }
            }
        }
        return false;
    },

    tryInsertAfterTitle(elements) {
        const titleElement = document.querySelector('h1.title');
        if (titleElement && titleElement.parentNode) {
            try {
                let previousElement = titleElement;
                elements.forEach(el => {
                    titleElement.parentNode.insertBefore(el, previousElement.nextSibling);
                    previousElement = el;
                });
                console.log('TL;DR: Inserted after title');
                return true;
            } catch (e) {
                console.error('Failed to insert after title', e);
            }
        }
        return false;
    },

    showLoading() {
        if (!this.summaryContainer) return;

        this.summaryContainer.style.display = 'block';
        this.summaryContainer.innerHTML = `
      <div class="yt-tldr-loading">
        <div class="yt-tldr-spinner"></div>
        <p>Generating summary...</p>
      </div>
    `;
    },

    displayError(errorMessage) {
        if (!this.summaryContainer) return;

        this.summaryContainer.innerHTML = `
      <div class="yt-tldr-error">
        <h3>Error generating summary</h3>
        <p>${errorMessage}</p>
        <button onclick="document.getElementById('yt-tldr-container').style.display='none'">Close</button>
      </div>
    `;
    },

    displaySummary(summary, markdownHelper) {
        if (!this.summaryContainer) {
            console.error("Cannot display summary: container missing");
            return;
        }

        try {
            // Process markdown
            markdownHelper.configureMarked();
            const processedSummary = markdownHelper.preprocessMarkdown(summary);
            let htmlContent = marked.parse(processedSummary);
            htmlContent = markdownHelper.processTimestamps(htmlContent);

            // Display summary
            this.summaryContainer.innerHTML = `
        <div class="yt-tldr-summary">
          <div class="yt-tldr-header">
            <h3>Video Summary</h3>
            <button class="yt-tldr-close" onclick="document.getElementById('yt-tldr-container').style.display='none'">×</button>
          </div>
          <div class="yt-tldr-content">${htmlContent}</div>
        </div>
      `;

            markdownHelper.addTimestampListeners();
        } catch (error) {
            this.displayError("Error displaying summary: " + error.message);
        }
    },

    hideContainer() {
        if (this.summaryContainer) {
            this.summaryContainer.style.display = 'none';
            this.summaryContainer.innerHTML = '';
        }
    }
};

export default uiManager;