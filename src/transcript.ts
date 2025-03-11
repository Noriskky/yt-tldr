import { promptAIStructured, resolveProvider, VideoSummary, videoSummarySchema } from "./ai/models.ts";
import process from "node:process";

function processPlaceholders(summary: string, title?: string): string {
    if (!title) {
        return summary;
    }
    return summary.replace(/%videotitle%/g, title);
}

export async function generateSummary(
    transcription: any[],
    summaryLength: string,
    model: string,
    title?: string,
    creator?: string,
    logging: boolean = true
): Promise<string> {
    if (logging) console.log("\x1b[32m%s\x1b[0m", "Fetched transcript from YouTube video");
    const prompt = `
      You're tasked with summarizing a YouTube video transcript. 🎥📝  
      Maintain a **neutral** tone and **never assume anything**—only summarize what is explicitly stated in the transcript. 🤖  
      Summarize the key points concisely, using **Smart Sections** with timestamps. ⏳  
      Avoid phrases like "This appears to be..." or "The speaker mentioned." Only state facts from the transcript. 🚫  
      The Speaker should always be called The Creator unless it's not the main speaker. 👤
      
      SUMMARYLENGTH: ${summaryLength}
      
      TRANSCRIPT:
      ${transcriptToText(transcription)}
    `

    try {
        let provider;
        if (logging) {
            switch (resolveProvider(model)) {
                case "google.generative-ai":
                    provider = "Google Gemini";
                    break;
                case "ollama.chat":
                    provider = "Ollama";
                    break;
                case "mistral.chat":
                    provider = "Mistral";
                    break;
                default:
                    throw new Error(`Unsupported model provider: ${resolveProvider(model)}`);
            }
            console.log("\x1b[33m%s\x1b[0m", `Generating response with ${provider}...`);
        }
        let interval, startTime
        if (logging) {
            startTime = Date.now();
            process.stdout.write("\x1b[33m⏳ Processing\x1b[0m");
            interval = setInterval(() => {
                process.stdout.write(".");
            }, 1000);
        }
        const data = await promptAIStructured(prompt, videoSummarySchema, model);
        const response = formatVideoSummary(data, title, creator);

        if (logging && interval && startTime) {
            clearInterval(interval);
            process.stdout.write("\r\x1b[K");

            console.log("\x1b[32m%s\x1b[0m", `Generated response with ${provider} in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
            console.log(response);
        }
        return processPlaceholders(response, title);
    } catch (error) {
        if (logging) console.error("\x1b[31m%s\x1b[0m", "Failed to generate response:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return "Failed to generate summary: " + errorMessage;
    }
}

/**
 * Converts a structured VideoSummary object to formatted text
 */
export function formatVideoSummary(data: any, title?: string, creator?: string): string {
    const summary = data as VideoSummary;
    let formattedText = '';
    formattedText += `🎬 **Title:** ${title}\n`;

    formattedText += `👤 **Creator:** ${creator}\n`;

    formattedText += '\n📄 **Summary:**\n';
    formattedText += summary.summary + '\n';

    formattedText += '\n📝 **Smart Sections:**\n\n';

    if (summary.smartSections && Array.isArray(summary.smartSections) && summary.smartSections.length > 0) {
        summary.smartSections.forEach(section => {
            const adPrefix = section.isAd ? '[AD] ' : '';
            formattedText += `${section.timestamp} - ${section.emoji} **${adPrefix}${section.title}**\n`;
        });
    } else {
        formattedText += "No sections available\n";
    }

    return formattedText;
}

// deno-lint-ignore no-explicit-any
function transcriptToText(transcript: Array<{text: string; offset: number; duration: number; [key: string]: any}>): string {
    return transcript.map(item => {
        const minutes = Math.floor(item.offset / 60);
        const seconds = Math.floor(item.offset % 60);
        const timestamp = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

        return `${timestamp} - ${item.text}`;
    }).join('\n');
}