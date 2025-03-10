import {generateText, LanguageModel} from "npm:ai";
import {google} from "npm:@ai-sdk/google@1.1.20";
import { ollama } from 'npm:ollama-ai-provider';

export const VALID_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";
export const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

/**
 * Generates a response Stream using Vercels AI-SDK
 */
export async function promptAI(prompt: string, modelname: string = DEFAULT_GEMINI_MODEL): Promise<string> {
  try {
    const model = resolveModel(modelname);

    const result = await generateText({
      model,
      prompt
    });

    return result.text
  } catch (error) {
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
}

export function resolveModel(model: string): LanguageModel {
  if (VALID_GEMINI_MODELS.includes(model) || model === "gemini") {
    const actualModel = model === "gemini" ? DEFAULT_GEMINI_MODEL : model;
    return google(actualModel);
  } else if (model.startsWith("ollama:")) {
    return ollama(model.replace(/^ollama:/, ""));
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}

export function resolveProvider(model: string): string {
  return resolveModel(model).provider;
}