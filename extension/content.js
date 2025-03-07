// YouTube TL;DR Extension - Content Script

let currentVideoId = null;
let summaryContainer = null;
let isExtensionActive = true;

// Check if extension context is valid
function checkExtensionContext() {
  try {
    // Try to access chrome API to verify context is valid
    chrome.runtime.getURL("");
    isExtensionActive = true;
    return true;
  } catch (e) {
    isExtensionActive = false;
    console.error("Extension context invalidated:", e);
    return false;
  }
}

// Safe access to Chrome API
function safeStorageGet(defaults, callback) {
  if (!checkExtensionContext()) {
    // If context is invalid, use defaults and notify user
    callback(defaults);
    return;
  }
  
  try {
    chrome.storage.sync.get(defaults, callback);
  } catch (e) {
    console.error("Failed to access Chrome storage:", e);
    callback(defaults);
  }
}

// Extract video ID from URL
function getYouTubeVideoId(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;
  
  if (pathname.startsWith('/watch')) {
    return urlObj.searchParams.get('v');
  } else if (pathname.startsWith('/shorts/')) {
    return pathname.slice(8);
  }
  return null;
}

// Create and insert the summary button and container more reliably
function insertSummaryElements() {
  // Check if we already added the button
  if (document.getElementById('yt-tldr-btn')) {
    return;
  }
  
  // Create the summary button
  const summaryButton = document.createElement('button');
  summaryButton.id = 'yt-tldr-btn';
  summaryButton.className = 'yt-tldr-button';
  summaryButton.textContent = 'TL;DR Summary';
  summaryButton.onclick = requestSummary;
  
  // Create the summary container (initially hidden)
  summaryContainer = document.createElement('div');
  summaryContainer.id = 'yt-tldr-container';
  summaryContainer.className = 'yt-tldr-summary-container';
  summaryContainer.style.display = 'none';
  
  // Try multiple potential insertion points for YouTube's ever-changing layout
  const insertPoints = [
    '#below', // Modern desktop layout
    '#info-contents', // Alternative layout
    '#above-the-fold', // Another possible layout
    '#bottom-row', // Mobile layout
    '#meta', // Yet another layout
    '#primary-inner' // Last resort
  ];
  
  let inserted = false;
  
  for (const selector of insertPoints) {
    const insertTarget = document.querySelector(selector);
    if (insertTarget) {
      try {
        insertTarget.prepend(summaryButton);
        insertTarget.prepend(summaryContainer);
        inserted = true;
        console.log('TL;DR: Inserted button at', selector);
        break;
      } catch (e) {
        console.error('Failed to insert at', selector, e);
      }
    }
  }
  
  if (!inserted) {
    // Last resort: try to insert after the title
    const titleElement = document.querySelector('h1.title');
    if (titleElement && titleElement.parentNode) {
      try {
        titleElement.parentNode.insertBefore(summaryContainer, titleElement.nextSibling);
        titleElement.parentNode.insertBefore(summaryButton, summaryContainer.nextSibling);
        inserted = true;
        console.log('TL;DR: Inserted button after title');
      } catch (e) {
        console.error('Failed to insert after title', e);
      }
    }
  }
  
  if (!inserted) {
    console.error('TL;DR: Could not find a suitable location to insert the button');
  }
}

// Preprocess markdown to fix list formatting issues
function preprocessMarkdown(markdown) {
  // Fix lists that don't have proper spacing before list items
  let fixedMarkdown = markdown.replace(/^(\s*[-*+])/gm, '\n$1');
  
  // Ensure proper spacing after list markers
  fixedMarkdown = fixedMarkdown.replace(/^(\s*[-*+])(?!\s)/gm, '$1 ');
  
  // Fix numbered lists formatting
  fixedMarkdown = fixedMarkdown.replace(/^(\s*\d+\.)(?!\s)/gm, '$1 ');
  
  // Remove duplicate newlines (keep max 2)
  fixedMarkdown = fixedMarkdown.replace(/\n{3,}/g, '\n\n');
  
  return fixedMarkdown;
}

// Configure Marked options for better list handling
function configureMarked() {
  marked.setOptions({
    gfm: true,          // Use GitHub Flavored Markdown
    breaks: true,       // Render newlines as <br>
    pedantic: false,    // Don't be too strict with original markdown spec
    smartLists: true,   // Use smarter list behavior than the original markdown
    smartypants: true,  // Use smart typographic punctuation
    xhtml: false        // Don't close empty tags with XML
  });
}

// Check if a video has captions/transcripts available
async function checkTranscriptAvailability() {
  try {
    // More robust detection approach
    
    // First method: Check if captions button exists and is enabled
    const ccButton = document.querySelector('.ytp-subtitles-button');
    if (ccButton) {
      // Check if captions are available (not disabled)
      const disabled = ccButton.getAttribute('aria-disabled') === 'true';
      if (!disabled) {
        return true;
      }
    }
    
    // Second method: Check video element for text tracks
    const video = document.querySelector('video');
    if (video && video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i++) {
        // Check if any text track is a caption or subtitle
        const track = video.textTracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          return true;
        }
      }
    }
    
    // Third method: Just try to get the transcript and see if it works
    // (we rely on the backend for this check)
    return true;
  } catch (error) {
    console.error("Error checking transcript availability:", error);
    // If in doubt, let the backend try - it will handle transcript unavailability
    return true;
  }
}

// Request a summary from the backend with better error handling
async function requestSummary() {
  if (!currentVideoId || !checkExtensionContext()) {
    console.error('Invalid extension context or missing video ID');
    return;
  }
  
  // Show loading state
  summaryContainer.style.display = 'block';
  summaryContainer.innerHTML = `
    <div class="yt-tldr-loading">
      <div class="yt-tldr-spinner"></div>
      <p>Generating summary...</p>
    </div>
  `;
  
  try {
    // Get settings from local storage
    safeStorageGet({
      apiUrl: 'http://localhost:8000/summarize',
      model: 'llama3.2:latest',
      length: 'short'
    }, async function(settings) {
      if (!isExtensionActive) {
        displayError("Extension context was invalidated. Please refresh the page and try again.");
        return;
      }
      
      try {
        // Log the request for debugging
        console.log('Sending request to:', settings.apiUrl, {
          videoId: currentVideoId,
          model: settings.model,
          length: settings.length
        });
        
        // Make API request with proper CORS settings
        const response = await fetch(settings.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({
            videoId: currentVideoId,
            model: settings.model,
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
          displaySummary(data.summary);
        } else {
          throw new Error("No summary was returned from the server");
        }
      } catch (error) {
        console.error('Summary request failed:', error);
        displayError(error.message || "Failed to generate summary");
      }
    });
  } catch (error) {
    console.error('Request error:', error);
    displayError("Failed to generate summary: " + error.message);
  }
}

// Identify and make timestamps clickable
function processTimestamps(htmlContent) {
  // Regular expression to match common timestamp formats (00:00, 0:00, 00m00s, etc.)
  const timestampRegex = /\b(\d{1,2}):(\d{2})\b/g;
  
  // Replace timestamps with clickable links
  return htmlContent.replace(timestampRegex, function(match, minutes, seconds) {
    // Calculate timestamp in seconds
    const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
    
    // Create a clickable timestamp span
    return `<span class="yt-tldr-timestamp" data-time="${totalSeconds}">${match}</span>`;
  });
}

// Add click event listener for timestamps
function addTimestampListeners() {
  const timestamps = document.querySelectorAll('.yt-tldr-timestamp');
  timestamps.forEach(timestamp => {
    timestamp.addEventListener('click', function() {
      const time = this.getAttribute('data-time');
      if (time) {
        // Navigate to the timestamp in the video
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = time;
          video.play();
        }
      }
    });
  });
}

// Display the generated summary with proper markdown formatting
function displaySummary(summary) {
  if (!checkExtensionContext() || !summaryContainer) {
    console.error("Cannot display summary: extension context invalid or container missing");
    return;
  }
  
  try {
    // Configure Marked options
    configureMarked();
    
    // Preprocess the markdown to fix common list formatting issues
    const processedSummary = preprocessMarkdown(summary);
    
    // Use Marked.js to convert markdown to HTML
    let htmlContent = marked.parse(processedSummary);
    
    // Process timestamps to make them clickable
    htmlContent = processTimestamps(htmlContent);
    
    summaryContainer.innerHTML = `
      <div class="yt-tldr-summary">
        <div class="yt-tldr-header">
          <h3>Video Summary</h3>
          <button class="yt-tldr-close" onclick="document.getElementById('yt-tldr-container').style.display='none'">×</button>
        </div>
        <div class="yt-tldr-content">${htmlContent}</div>
      </div>
    `;
    
    // Add click listeners after the content is added to DOM
    addTimestampListeners();
  } catch (error) {
    displayError("Error displaying summary: " + error.message);
  }
}

// Display error message
function displayError(errorMessage) {
  if (!summaryContainer) return;
  
  summaryContainer.innerHTML = `
    <div class="yt-tldr-error">
      <h3>Error generating summary</h3>
      <p>${errorMessage}</p>
      <button onclick="document.getElementById('yt-tldr-container').style.display='none'">Close</button>
    </div>
  `;
}

// More robust setup for navigation monitoring
function setupNavigationMonitor() {
  // Initial check
  checkForVideoPage();
  
  // Watch for URL changes
  let lastUrl = location.href;
  const bodyObserver = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      console.log('URL changed to:', location.href);
      setTimeout(checkForVideoPage, 500); // Give the page a moment to load
    }
  });
  
  bodyObserver.observe(document.body, { 
    childList: true,
    subtree: true 
  });
  
  // Also watch for YouTube's SPA navigation which may not change URL
  const ytdAppObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Check if we're on a video page now
        setTimeout(checkForVideoPage, 1000);
        break;
      }
    }
  });
  
  // Try to find the YouTube app container
  function findAndObserveYouTubeApp() {
    const ytdApp = document.querySelector('ytd-app') || document.querySelector('#content');
    if (ytdApp) {
      ytdAppObserver.observe(ytdApp, { 
        childList: true,
        subtree: false 
      });
      console.log('Observing YouTube app container for navigation');
    } else {
      setTimeout(findAndObserveYouTubeApp, 1000);
    }
  }
  
  findAndObserveYouTubeApp();
}

// Check if we're on a video page and setup accordingly
function checkForVideoPage() {
  const videoId = getYouTubeVideoId(window.location.href);
  
  if (videoId) {
    // Check if video ID has changed
    if (videoId !== currentVideoId) {
      // Reset summary container if it exists
      if (summaryContainer) {
        summaryContainer.style.display = 'none';
        summaryContainer.innerHTML = '';
      }
      
      // Update current video ID
      currentVideoId = videoId;
    }
    
    // Give time for YouTube to load its UI
    setTimeout(insertSummaryElements, 1000);
  } else {
    // Reset if we've navigated away from a video page
    if (currentVideoId) {
      currentVideoId = null;
      if (summaryContainer) {
        summaryContainer.style.display = 'none';
        summaryContainer.innerHTML = '';
      }
    }
  }
}

// Initialize the extension
function init() {
  // Verify extension context before starting
  if (!checkExtensionContext()) {
    console.error("Extension context is invalid at initialization");
    return;
  }
  
  setupNavigationMonitor();
  
  // Re-check context periodically
  setInterval(checkExtensionContext, 5000);
}

// Start the extension
init();
