import { createSummaryPrompt, transcriptToText } from "./prompt.ts";
import { promptAI, resolveProvider,} from "./ai/models.ts";
import process from "node:process";

function processPlaceholders(summary: string, title?: string): string {
    if (!title) {
        return summary;
    }
    return summary.replace(/%videotitle%/g, title);
}

export async function generateSummary(
    // deno-lint-ignore no-explicit-any
    transcription: any[],
    summaryLength: string,
    model: string,
    title?: string,
    creator?: string
): Promise<string> {
    console.log("\x1b[32m%s\x1b[0m", "Fetched transcript from YouTube video");

    const prompt = createSummaryPrompt(summaryLength, title, creator);
    const text = prompt + "\n\nTranscript:\n---\n" + transcriptToText(transcription) + "\n---\n";

    try {
        const provider = resolveProvider(model);
        switch (provider) {
            case "google.generative-ai":
                console.log("\x1b[33m%s\x1b[0m", "Generating response with Google Gemini...");
                break;
            case "ollama.chat":
                console.log("\x1b[33m%s\x1b[0m", "Generating response with Ollama...");
                break;
            default:
                throw new Error(`Unsupported model provider: ${provider}`);
        }

        const startTime = Date.now();
        process.stdout.write("\x1b[33m⏳ Processing\x1b[0m");
        const interval = setInterval(() => {
            process.stdout.write(".");
        }, 1000);

        const response = await promptAI(text, model);

        clearInterval(interval);
        process.stdout.write("\r\x1b[K");

        console.log("\x1b[32m%s\x1b[0m", `Generated response with ${provider === 'google.generative-ai' ? "Gemini" : "Ollama"} in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
        console.log(response);
        return processPlaceholders(response, title);
    } catch (error) {
        console.error("\x1b[31m%s\x1b[0m", "Failed to generate response:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return "Failed to generate summary: " + errorMessage;
    }
}