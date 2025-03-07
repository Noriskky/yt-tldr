/**
 * Creates a prompt for generating video summaries
 */
export function createSummaryPrompt(summaryLength: string, title?: string, creator?: string): string {
  return `
  You're tasked with summarizing a YouTube video transcript. 🎥📝  
  Maintain a **neutral** tone and **never assume anything**—only summarize what is explicitly stated in the transcript. 🤖  
  Summarize the key points concisely, using **Smart Sections** with timestamps. ⏳  
  Avoid phrases like "This appears to be..." or "The speaker mentioned." Only state facts from the transcript. 🚫  
  If there is an ad section, clearly label it as **[AD]** with the corresponding timestamp. 📢  
  The Speaker should always be called The Creator unless it's not the main speaker. 👤
  In the Summary if you want to display the title of the video, use the placeholder "%videotitle%".

  📄 **How to structure the summary:**  
  1️⃣ Start with a **short paragraph** summarizing the overall topic and key takeaways of the video.  
  2️⃣ Only include **Smart Sections** if there is **enough meaningful information** in that part of the video.  
  3️⃣ For **each Smart Section**, only include a **title** (without a detailed summary), unless a full summary is necessary.  
  
  **Metadata:**
    - **Title:** ${title || '[Video Title Unknown]'}
    - **Creator:** ${creator || '[Creator Name Unknown please refer to as The Creator]'}
  
  🔧 **Customization:**  
  - **Length:** ${summaryLength} summary.  
  - **Clarity:** Use **clear and engaging** language.  
  - **Timestamps:** Only include timestamps for **major sections**, not minor points.  
  - **Emojis:** Include at least one emoji per section for readability!  
  
  ⚠️ **IMPORTANT MARKDOWN FORMATTING INSTRUCTIONS:** ⚠️
  - For bullet lists, use "- " (hyphen followed by space) at the beginning of each line
  - For numbered lists, use "1. " (number, period, space) format
  - Always add a blank line BEFORE starting any list
  - Each list item should be on its own line
  - Example proper formatting:
  
  Here's some text.
  
  - First bullet point
  - Second bullet point
  - Third bullet point
  
  More text here.
  
  1. First numbered item
  2. Second numbered item
  
  📌 **Example Format:**  
  
  🎬 **Title:** %videotitle%  
  ${creator ? `👤 **Creator:** ${creator}  ` : ''}  
  🎙️ **Speaker(s):** [If available]  
  
  📄 **Summary:**  
  [Brief paragraph summarizing the overall topic and key takeaways of the video.]  
  
  📝 **Smart Sections:**  
  
  [Timestamp] - 🚀 **[Main Topic]**  
  [Timestamp] - 💡 **[Another Topic]**  
  [Timestamp] - 🎯 **[Final Thought]**  
  [Timestamp] - 📢 **[AD] [Ad Topic]**  
  
  ℹ️ **Important:**  
  - **Do not provide a detailed summary in Smart Sections.** Only include **titles** unless more information is required.  
  - **Only include a title if the section has enough relevant information to stand alone.**  
  - **Group related points together** rather than creating too many small, fragmented sections.  
  - Ensure the **summary matches the selected length ("${summaryLength}")**, remains **concise**, and **avoids unnecessary sections!** 🚀🔥  
  `;
}

/**
 * Converts transcript data to formatted text with timestamps
 */
// deno-lint-ignore no-explicit-any
export function transcriptToText(transcript: Array<{text: string; offset: number; duration: number; [key: string]: any}>): string {
  return transcript.map(item => {
    const minutes = Math.floor(item.offset / 60);
    const seconds = Math.floor(item.offset % 60);
    const timestamp = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    
    return `${timestamp} - ${item.text}`;
  }).join('\n');
}
