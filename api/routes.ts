import { Router } from "https://deno.land/x/oak/mod.ts";
import { fetchTranscript, fetchVideoMetadata } from "../src/youtube.ts";
import {VALID_GEMINI_MODELS, DEFAULT_GEMINI_MODEL, promptAI} from "../src/ai/models.ts";
import { createSummaryPrompt, transcriptToText } from "../src/prompt.ts";
import { formatMarkdown } from "./utils.ts";

const router = new Router();

router.get("/health", (ctx) => {
    ctx.response.body = { status: "ok" };
});

// Video summary endpoint
router.post("/summarize", async (ctx) => {
    const body = await ctx.request.body.json();
    const { videoId, model = "gemini", length = "short" } = body;

    if (!videoId) {
        ctx.response.status = 400;
        ctx.response.body = { error: "No video ID provided" };
        return;
    }

    if (length !== "short" && length !== "long") {
        ctx.response.status = 400;
        ctx.response.body = { error: "Invalid length. Use 'short' or 'long'" };
        return;
    }

    console.log(`Processing video: ${videoId} with model: ${model}`);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const { title, creator } = await fetchVideoMetadata(videoUrl);

    let transcript;
    try {
        transcript = await fetchTranscript(videoUrl);

        if (!transcript || transcript.length === 0) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "No transcript available",
                message: "This video does not have captions or a transcript available."
            };
            return;
        }
    } catch (transcriptError) {
        console.error("Transcript fetch error:", transcriptError);
        ctx.response.status = 400;
        ctx.response.body = {
            error: "Transcript fetch failed",
            message: "Failed to retrieve the transcript for this video. It may not have captions available."
        };
        return;
    }

    const summary = await generateSummary(transcript, length, model, title, creator);

    if (!summary || summary.trim() === "") {
        throw new Error("Failed to generate summary");
    }

    const formattedSummary = formatMarkdown(summary);

    ctx.response.body = {
        videoId,
        title,
        creator,
        summary: formattedSummary
    };
});

function processPlaceholders(summary: string, title?: string): string {
    if (!title) {
        return summary;
    }
    return summary.replace(/%videotitle%/g, title);
}

async function generateSummary(transcript: any[], length: string, model: string, title?: string, creator?: string): Promise<string> {
    const prompt = createSummaryPrompt(length, title, creator) +
        "\n\nPlease format your response in markdown with clear list formatting - ensure each list item is on a new line with proper markdown syntax (- item or 1. item with a space after the marker).";
    const text = prompt + "\n\nTranscript:\n---\n" + transcriptToText(transcript) + "\n---\n";

    return processPlaceholders(await promptAI(text, model), title);
}

export default router;