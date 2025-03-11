import {generateObject, LanguageModel} from "npm:ai";
import {google} from "npm:@ai-sdk/google@1.1.20";
import {createOllama, ollama} from 'npm:ollama-ai-provider';
import { mistral } from 'npm:@ai-sdk/mistral';
import { z } from 'npm:zod';

export const VALID_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
export const VALID_MISTRAL_MODELS = ["pixtral-large-latest", "mistral-large-latest", "mistral-small-latest", "ministral-3b-latest", "ministral-8b-latest", "pixtral-12b-2409"];
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";
export const DEFAULT_MISTRAL_MODEL = "mistral-small-latest";

/**
 * Generates a structured object response using Vercel's AI-SDK
 */
export async function promptAIStructured<T extends z.ZodType>(
    prompt: string,
    schema: T,
    modelname: string = DEFAULT_GEMINI_MODEL
): Promise<z.infer<T>> {
  try {
    const model = resolveModel(modelname);

    const result = await generateObject({
      model,
      prompt,
      schema,
      output: 'object',
      temperature: 0.2
    });

    return result.object;
  } catch (error) {
    handleAIError(error, modelname);
  }
}

function handleAIError(error: unknown, modelname: string): never {
  let errorMessage = "Unknown error";
  if (error instanceof Error) {
    errorMessage = error.message;
    console.error("\x1b[31m%s\x1b[0m", "Error details:", error.stack);
  }

  if (resolveModel(modelname).provider === "ollama") {
    if (errorMessage.includes("not found") || errorMessage.includes("no such model")) {
      throw new Error(`Model "${modelname}" not found. Please check if the model is properly installed in Ollama.`);
    } else if (errorMessage.includes("connect")) {
      throw new Error("Failed to connect to Ollama server. Is Ollama running?");
    }
  }
  console.error("\x1b[31m%s\x1b[0m", `Error generating response:`, error);
  throw error;
}

export function resolveModel(model: string): LanguageModel {
  const ollama = createOllama({
    baseURL: 'http://localhost:11434/api',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });

  if (VALID_GEMINI_MODELS.includes(model) || model === "gemini") {
    const actualModel = model === "gemini" ? DEFAULT_GEMINI_MODEL : model;
    return google(actualModel);
  } else if (VALID_MISTRAL_MODELS.includes(model)) {
    return mistral(model);
  } else if (model.startsWith("ollama:")) {
    return ollama(model.replace(/^ollama:/, ""));
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

export function resolveProvider(model: string): string {
  return resolveModel(model).provider;
}

/**
 * Schema for video summary structured output that exactly matches the prompt format
 */
export const videoSummarySchema = z.object({
  summary: z.string().describe("Brief paragraph summarizing the overall topic and key takeaways"),
  smartSections: z.array(z.object({
    timestamp: z.string().describe("Timestamp in MM:SS format"),
    emoji: z.string().describe("Single emoji representing the section content"),
    title: z.string().describe("Section title"),
    isAd: z.boolean().default(false).describe("Whether this section is an advertisement"),
  })).describe("Smart sections with timestamps and emojis for major parts of the video"),
  metadata: z.object({
    summaryLength: z.enum(["short", "long"]).describe("Length of summary requested"),
    videoTitle: z.string().optional().describe("Original video title if known")
  }).optional()
});

export type VideoSummary = z.infer<typeof videoSummarySchema>;