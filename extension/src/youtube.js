// YouTube interface functionality
const youtubeInterface = {
    currentVideoId: null,

    getVideoId(url) {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        if (pathname.startsWith('/watch')) {
            return urlObj.searchParams.get('v');
        } else if (pathname.startsWith('/shorts/')) {
            return pathname.slice(8);
        }
        return null;
    },

    checkTranscriptAvailability() {
        try {
            const ccButton = document.querySelector('.ytp-subtitles-button');
            if (ccButton && ccButton.getAttribute('aria-disabled') !== 'true') {
                return true;
            }

            const video = document.querySelector('video');
            if (video && video.textTracks && video.textTracks.length > 0) {
                for (let i = 0; i < video.textTracks.length; i++) {
                    const track = video.textTracks[i];
                    if (track.kind === 'captions' || track.kind === 'subtitles') {
                        return true;
                    }
                }
            }

            return true;
        } catch (error) {
            console.error("Error checking transcript availability:", error);
            return true;
        }
    },

    setupNavigationMonitor(checkForVideoPageCallback) {
        // Initial check
        checkForVideoPageCallback();

        // Watch for URL changes
        let lastUrl = location.href;
        const bodyObserver = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('URL changed to:', location.href);
                setTimeout(checkForVideoPageCallback, 500);
            }
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observeYoutubeApp(checkForVideoPageCallback);
    },

    observeYoutubeApp(checkForVideoPageCallback) {
        const ytdAppObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    setTimeout(checkForVideoPageCallback, 1000);
                    break;
                }
            }
        });

        const findAndObserve = () => {
            const ytdApp = document.querySelector('ytd-app') || document.querySelector('#content');
            if (ytdApp) {
                ytdAppObserver.observe(ytdApp, {
                    childList: true,
                    subtree: false
                });
                console.log('Observing YouTube app container for navigation');
            } else {
                setTimeout(findAndObserve, 1000);
            }
        };

        findAndObserve();
    }
};

export default youtubeInterface;