import {Chat} from "jsr:@epi/ollama";
import {GoogleGenerativeAI} from "npm:@google/generative-ai@^0.2.0";

// Model type for supported models
export type ModelType = "llama3.2" | "gemini-2.0-flash" | "gemini-2.0-flash-lite";

// Valid Gemini models
export const VALID_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"];

// Default Gemini model
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

// Default Ollama model
export const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

/**
 * Generates a response using Ollama API
 */
export async function generateWithOllama(prompt: string, model: string = DEFAULT_OLLAMA_MODEL): Promise<string> {
  try {
    const cleanModel = model.replace(/^ollama:/, '');
    
    console.log(`Using Ollama model: ${cleanModel}`);
    const messages = [{ role: "user" as const, content: prompt }];

    let actualModel = cleanModel;
    if (cleanModel === "llama3" || cleanModel === "llama3.2") {
      actualModel = "llama3.2:latest";
    }

    return await Chat({
      messages,
      model: actualModel
    });
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Error generating response from Ollama:", error);
    
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("\x1b[31m%s\x1b[0m", "Error details:", error.stack);
    }

    if (errorMessage.includes("not found") || errorMessage.includes("no such model")) {
      throw new Error(`Model "${model}" not found. Please check if the model is properly installed in Ollama.`);
    } else if (errorMessage.includes("connect")) {
      throw new Error("Failed to connect to Ollama server. Is Ollama running?");
    }
    
    throw error;
  }
}

/**
 * Generates a response using Google's Gemini models
 */
export async function generateWithGemini(prompt: string, model: string = "gemini-2.0-flash"): Promise<string> {
  // Check for API key
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("No GEMINI_API_KEY environment variable found. Please set it before using Gemini models.");
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const actualModel = VALID_GEMINI_MODELS.includes(model)
        ? model
        : model === "gemini"
            ? DEFAULT_GEMINI_MODEL
            : model;

    if (!VALID_GEMINI_MODELS.includes(actualModel)) {
      throw new Error(`Unsupported Gemini model: ${model}. Supported models: ${VALID_GEMINI_MODELS.join(", ")}`);
    }
    
    const genModel = genAI.getGenerativeModel({ model: actualModel });
    
    const result = await genModel.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Error generating response from Gemini:", error);
    throw error;
  }
}

/**
 * Unified function to generate responses from different models
 */
export async function generateResponse(
  prompt: string, 
  modelType: ModelType | string = DEFAULT_OLLAMA_MODEL
): Promise<string> {
  if (modelType === "gemini" || VALID_GEMINI_MODELS.includes(modelType)) {
    const actualModel = modelType === "gemini" ? DEFAULT_GEMINI_MODEL : modelType;
    return generateWithGemini(prompt, actualModel);
  } 

  return generateWithOllama(prompt, modelType);
}