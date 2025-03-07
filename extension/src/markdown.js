// Markdown processing
const markdownHelper = {
  configureMarked() {
    marked.setOptions({
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: true,
      xhtml: false
    });
  },

  preprocessMarkdown(markdown) {
    // Fix lists that don't have proper spacing before list items
    let fixedMarkdown = markdown.replace(/^(\s*[-*+])/gm, '\n$1');

    // Ensure proper spacing after list markers
    fixedMarkdown = fixedMarkdown.replace(/^(\s*[-*+])(?!\s)/gm, '$1 ');

    // Fix numbered lists formatting
    fixedMarkdown = fixedMarkdown.replace(/^(\s*\d+\.)(?!\s)/gm, '$1 ');

    // Remove duplicate newlines (keep max 2)
    fixedMarkdown = fixedMarkdown.replace(/\n{3,}/g, '\n\n');

    return fixedMarkdown;
  },

  processTimestamps(htmlContent) {
    const timestampRegex = /\b(\d{1,2}):(\d{2})\b/g;
    return htmlContent.replace(timestampRegex, (match, minutes, seconds) => {
      const totalSeconds = parseInt(minutes) * 60 + parseInt(seconds);
      return `<span class="yt-tldr-timestamp" data-time="${totalSeconds}">${match}</span>`;
    });
  },

  addTimestampListeners() {
    const timestamps = document.querySelectorAll('.yt-tldr-timestamp');
    timestamps.forEach(timestamp => {
      timestamp.addEventListener('click', function() {
        const time = this.getAttribute('data-time');
        if (time) {
          const video = document.querySelector('video');
          if (video) {
            video.currentTime = time;
            video.play();
          }
        }
      });
    });
  }
};

export default markdownHelper;