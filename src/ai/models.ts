import { Chat } from "jsr:@epi/ollama";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@^0.2.0";

// Model type for supported models
export type ModelType = "llama3.2" | "gemini-2.0-flash" | "gemini-2.0-flash-lite" | "gemini-2.0-flash-exp";

// Valid Gemini models
export const VALID_GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash-exp"];

// Default Gemini model
export const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

// Default Ollama model
export const DEFAULT_OLLAMA_MODEL = "llama3.2:latest";

/**
 * Generates a response using Ollama API
 */
export async function generateWithOllama(prompt: string, model: string = DEFAULT_OLLAMA_MODEL): Promise<string> {
  try {
    // Remove any 'ollama:' prefix if present
    const cleanModel = model.replace(/^ollama:/, '');
    
    console.log(`Using Ollama model: ${cleanModel}`);
    const messages = [{ role: "user", content: prompt }];
    
    // Handle special case for llama3.2 model string formats
    // Sometimes the model could be specified as "llama3" or "llama3.2" without version
    let actualModel = cleanModel;
    if (cleanModel === "llama3" || cleanModel === "llama3.2") {
      actualModel = "llama3.2:latest";
    }
    
    const response = await Chat({ 
      messages,
      model: actualModel
    });
    
    return response;
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Error generating response from Ollama:", error);
    
    // Enhanced error information
    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("\x1b[31m%s\x1b[0m", "Error details:", error.stack);
    }
    
    // Provide helpful suggestions based on error message
    if (errorMessage.includes("not found") || errorMessage.includes("no such model")) {
      throw new Error(`Model "${model}" not found. Please check if the model is properly installed in Ollama.`);
    } else if (errorMessage.includes("connect")) {
      throw new Error("Failed to connect to Ollama server. Is Ollama running?");
    }
    
    throw error;
  }
}

/**
 * Resolves model name, handling "gemini" shorthand
 */
function resolveGeminiModel(model: string): string {
  if (VALID_GEMINI_MODELS.includes(model)) {
    return model;
  } else if (model === "gemini") {
    return DEFAULT_GEMINI_MODEL;
  }
  return model;
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
    
    // Process the model name, handling the "gemini" shorthand
    const actualModel = resolveGeminiModel(model);
    
    // Verify the model is supported
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
 * Generates a response using Gemini API
 */
export async function generateWithGeminiAPI(prompt: string, model: string): Promise<string> {
  // Check for API key
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("No GEMINI_API_KEY environment variable found. Please set it before using Gemini models.");
  }
 
  // Handle model name parsing using the shared resolver
  const geminiModel = resolveGeminiModel(model);
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${geminiModel}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate with Gemini: ${error.message}`);
    }
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
  // Check for Gemini models
  if (modelType === "gemini" || VALID_GEMINI_MODELS.includes(modelType)) {
    const actualModel = modelType === "gemini" ? DEFAULT_GEMINI_MODEL : modelType;
    return generateWithGemini(prompt, actualModel);
  } 
  
  // Otherwise use Ollama (without the "ollama:" prefix)
  return generateWithOllama(prompt, modelType);
}