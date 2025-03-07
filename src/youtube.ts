import { YoutubeTranscript } from "npm:youtube-transcript";

/**
 * Fetches transcript from a YouTube video URL
 */
export async function fetchTranscript(videoUrl: string): Promise<any[]> {
  return YoutubeTranscript.fetchTranscript(videoUrl);
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractVideoId(url: string): string {
  // Handle different YouTube URL formats
  if (url.includes("youtube.com/watch")) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("v") || url;
  } else if (url.includes("youtu.be/")) {
    // Handle shortened URLs
    const parts = url.split("youtu.be/");
    return parts[1].split("?")[0];
  } else if (url.includes("youtube.com/v/")) {
    const parts = url.split("youtube.com/v/");
    return parts[1].split("?")[0];
  }
  
  // If no patterns match, assume the input is a direct video ID
  return url;
}

/**
 * Fetch YouTube video metadata using oEmbed (no API key required)
 */
export async function fetchVideoMetadata(videoUrl: string): Promise<{ title: string, creator: string }> {
  try {
    // Extract video ID if it's a URL
    const id = extractVideoId(videoUrl);
    
    // Use YouTube's oEmbed endpoint to get video information
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch video metadata: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      title: data.title || "Unknown",
      creator: data.author_name || "Unknown"
    };
  } catch (error) {
    console.error("Error fetching video metadata:", error);
    return {
      title: "Unknown",
      creator: "Unknown"
    };
  }
}
