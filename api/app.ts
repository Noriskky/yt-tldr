import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import { fetchTranscript, fetchVideoMetadata } from "../src/youtube.ts";
import { generateWithGemini, generateWithOllama, VALID_GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "../src/ai/models.ts";
import { createSummaryPrompt, transcriptToText } from "../src/prompt.ts";

const app = new Application();
const router = new Router();

// Configure CORS with more permissive settings
app.use(oakCors({
  origin: "*",  // Allow any origin
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Handle OPTIONS requests explicitly
app.use(async (ctx, next) => {
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 204;
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    ctx.response.headers.set("Access-Control-Max-Age", "86400");
    return;
  }
  await next();
});

// Make API errors more informative
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error("Server error:", err);
    ctx.response.status = err.status || 500;
    ctx.response.body = {
      error: err.message || "Internal Server Error",
      stack: Deno.env.get("ENVIRONMENT") === "development" ? err.stack : undefined
    };
    ctx.response.headers.set("Content-Type", "application/json");
  }
});

// Health check endpoint
router.get("/health", (ctx) => {
  ctx.response.body = { status: "ok" };
});

// Function to fix markdown formatting for better rendering
function formatMarkdown(markdown: string): string {
  // Existing formatting fixes
  let formatted = markdown;
  
  // Ensure list items have proper spacing
  formatted = formatted.replace(/^(\s*[-*+])(?!\s)/gm, '$1 ');
  
  // Fix numbered lists formatting
  formatted = formatted.replace(/^(\s*\d+\.)(?!\s)/gm, '$1 ');
  
  // Ensure lists have a blank line before them for proper markdown processing
  formatted = formatted.replace(/([^\n])\n(\s*[-*+])/g, '$1\n\n$2');
  formatted = formatted.replace(/([^\n])\n(\s*\d+\.)/g, '$1\n\n$2');
  
  // Enhance timestamp formatting for better detection
  // Match timestamp patterns and ensure they're properly formatted
  formatted = formatted.replace(/\b(\d{1,2}):(\d{2})\b/g, function(match, minutes, seconds) {
    // Ensure minutes are padded if needed
    const formattedMinutes = minutes.length === 1 ? `0${minutes}` : minutes;
    return `${formattedMinutes}:${seconds}`;
  });
  
  return formatted;
}

// Video summary endpoint
router.post("/summarize", async (ctx) => {
  try {
    // Parse request body
    const body = await ctx.request.body.json();
    const { videoId, model = "llama3.2:latest", length = "short" } = body;
    
    if (!videoId) {
      ctx.response.status = 400;
      ctx.response.body = { error: "No video ID provided" };
      return;
    }
    
    // Validate length
    if (length !== "short" && length !== "long") {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid length. Use 'short' or 'long'" };
      return;
    }
    
    console.log(`Processing video: ${videoId} with model: ${model}`);
    
    try {
      // Fetch video metadata
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const { title, creator } = await fetchVideoMetadata(videoUrl);
      
      // Fetch transcript with better error handling
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
      
      // Generate summary
      const prompt = createSummaryPrompt(length, title, creator) + 
        "\n\nPlease format your response in markdown with clear list formatting - ensure each list item is on a new line with proper markdown syntax (- item or 1. item with a space after the marker).";
      const text = prompt + "\n\nTranscript:\n---\n" + transcriptToText(transcript) + "\n---\n";
      
      let summary;
      if (model === "gemini" || VALID_GEMINI_MODELS.includes(model)) {
        // Handle Gemini models
        const modelToUse = model === "gemini" ? DEFAULT_GEMINI_MODEL : model;
        summary = await generateWithGemini(text, modelToUse);
      } else {
        // Default to Ollama
        summary = await generateWithOllama(text, model);
      }
      
      if (!summary || summary.trim() === "") {
        throw new Error("Failed to generate summary");
      }
      
      // Fix markdown formatting
      const formattedSummary = formatMarkdown(summary);
      
      ctx.response.body = {
        videoId,
        title,
        creator,
        summary: formattedSummary
      };
    } catch (error) {
      // Handle specific operation errors
      console.error(`Error processing video ${videoId}:`, error);
      ctx.response.status = 500;
      ctx.response.body = { 
        error: "Failed to generate summary",
        message: error instanceof Error ? error.message : String(error)
      };
    }
  } catch (error) {
    // Handle general request errors
    console.error("Error processing request:", error);
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Failed to process request", 
      message: error instanceof Error ? error.message : String(error)
    };
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// Start the server
const port = 8000;
console.log(`Server running on http://localhost:${port}`);
await app.listen({ port });
