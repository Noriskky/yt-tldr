import { parse } from "https://deno.land/std@0.114.0/flags/mod.ts";
import { fetchTranscript, fetchVideoMetadata } from "./src/youtube.ts";
import { 
  generateWithOllama, 
  generateWithGemini, 
  VALID_GEMINI_MODELS, 
  DEFAULT_GEMINI_MODEL 
} from "./src/ai/models.ts";
import { createSummaryPrompt, transcriptToText } from "./src/prompt.ts";
import { printHelp, validateLength } from "./src/cli.ts";

async function processTranscript(
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
    console.log("\x1b[33m%s\x1b[0m", "Generating response with Google Gemini...");
    try {
      // Handle the special case for "gemini" directly
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
  } else {
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
}

function main() {
  let model = "llama3.2:latest";
  const args = parse(Deno.args);
  
  if (args.help || args.h) {
    printHelp();
    Deno.exit(0);
  }

  if (args.model) model = args.model;

  if (args.video) {
    console.log("\x1b[33m%s\x1b[0m", "Fetching transcript from YouTube video...");
    
    // First fetch video metadata
    fetchVideoMetadata(args.video)
      .then(({ title, creator }) => {
        console.log("\x1b[36m%s\x1b[0m", `Video title: ${title}`);
        console.log("\x1b[36m%s\x1b[0m", `Creator: ${creator}`);
        
        // Then fetch transcript
        return fetchTranscript(args.video)
          .then((transcription) => {
            const summaryLength = args.length?.toString().toLowerCase() || "short";
            
            if (!validateLength(args.length, summaryLength)) {
              Deno.exit(1);
            }
            
            console.log("\x1b[36m%s\x1b[0m", `Using summary length: ${summaryLength}`);
            
            return processTranscript(transcription, summaryLength, model, title, creator);
          });
      })
      .catch(error => {
        console.error("\x1b[31m%s\x1b[0m", "Failed to fetch video metadata:", error);
        
        // Continue without metadata if it fails
        fetchTranscript(args.video)
          .then((transcription) => {
            const summaryLength = args.length?.toString().toLowerCase() || "short";
            
            if (!validateLength(args.length, summaryLength)) {
              Deno.exit(1);
            }
            
            console.log("\x1b[36m%s\x1b[0m", `Using summary length: ${summaryLength}`);
            
            return processTranscript(transcription, summaryLength, model);
          })
          .catch(error => {
            console.error("\x1b[31m%s\x1b[0m", "Failed to fetch transcript from YouTube:", error);
          });
      });
  } else {
    console.log("\x1b[33m%s\x1b[0m", "Please provide a YouTube video URL with --video");
    console.log("\x1b[36m%s\x1b[0m", "Use --help for more information");
  }
}

if (import.meta.main) {
  main();
}