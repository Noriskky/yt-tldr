import { createSummaryPrompt, transcriptToText } from "./prompt.ts";
import { DEFAULT_GEMINI_MODEL, generateWithGemini, generateWithOllama, VALID_GEMINI_MODELS } from "./ai/models.ts";

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
    creator?: string
): Promise<string> {
    console.log("\x1b[32m%s\x1b[0m", "Fetched transcript from YouTube video");

    const prompt = createSummaryPrompt(summaryLength, title, creator);
    const text = prompt + "\n\nTranscript:\n---\n" + transcriptToText(transcription) + "\n---\n";

    if (model === "gemini" || VALID_GEMINI_MODELS.includes(model)) {
        return processPlaceholders(await generateWithGeminiModel(text, model), title);
    } else {
        return processPlaceholders(await generateWithOllamaModel(text, model), title);
    }
}

async function generateWithGeminiModel(text: string, model: string): Promise<string> {
    console.log("\x1b[33m%s\x1b[0m", "Generating response with Google Gemini...");
    try {
        const modelToUse = model === "gemini" ? DEFAULT_GEMINI_MODEL : model;
        const response = await generateWithGemini(text, modelToUse);
        console.log("\x1b[32m%s\x1b[0m", "Generated response with Gemini");
        console.log(response);
        return response;
    } catch (error: unknown) {
        console.error("\x1b[31m%s\x1b[0m", "Failed to generate response with Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return "Failed to generate summary: " + errorMessage;
    }
}

async function generateWithOllamaModel(text: string, model: string): Promise<string> {
    console.log("\x1b[33m%s\x1b[0m", "Generating response with Ollama...");
    try {
        const response = await generateWithOllama(text, model);
        console.log("\x1b[32m%s\x1b[0m", "Generated response with Ollama");
        console.log(response);
        return response;
    } catch (error: unknown) {
        console.error("\x1b[31m%s\x1b[0m", "Failed to generate response with Ollama:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return "Failed to generate summary: " + errorMessage;
    }
}