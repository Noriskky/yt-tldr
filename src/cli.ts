/**
 * Prints help information for the CLI
 */
export function printHelp(): void {
  console.log("\x1b[36m%s\x1b[0m", "Usage: deno run main.ts [options]");
  console.log("\x1b[36m%s\x1b[0m", "Options:");
  console.log("\x1b[36m%s\x1b[0m", "  --video, -v       YouTube video URL or ID to summarize");
  console.log("\x1b[36m%s\x1b[0m", "  --length, -l      Summary length: short or long (default: short)");
  console.log("\x1b[36m%s\x1b[0m", "  --model, -m       AI model to use:");
  console.log("\x1b[36m%s\x1b[0m", "                    - llama3.2:latest (default)");
  console.log("\x1b[36m%s\x1b[0m", "                    - gemini (uses gemini-2.0-flash)");
  console.log("\x1b[36m%s\x1b[0m", "                    - gemini-2.0-flash");
  console.log("\x1b[36m%s\x1b[0m", "                    - gemini-2.0-flash-lite");
  console.log("\x1b[36m%s\x1b[0m", "                    - other Ollama models");
  console.log("\x1b[36m%s\x1b[0m", "  --help, -h        Show this help message");
}

/**
 * Validates the summary length parameter
 */
export function validateLength(lengthArg: any, summaryLength: string): boolean {
  const validLengths = ["short", "long"];
  
  if (lengthArg && !validLengths.includes(summaryLength)) {
    console.error("\x1b[31m%s\x1b[0m", `Invalid length specified: "${lengthArg}"`);
    console.error("\x1b[31m%s\x1b[0m", `Valid options are: ${validLengths.join(", ")}`);
    return false;
  }
  
  return true;
}
