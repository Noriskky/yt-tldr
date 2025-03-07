import { parse } from "https://deno.land/std@0.114.0/flags/mod.ts";
import { fetchTranscript, fetchVideoMetadata } from "./src/youtube.ts";
import { printHelp, validateLength } from "./src/cli.ts";
import { generateSummary } from "./src/transcript.ts";

async function processSummary(
    videoUrl: string,
    lengthOption: string | undefined,
    model: string,
    title?: string,
    creator?: string
): Promise<void> {
  console.log("\x1b[33m%s\x1b[0m", "Fetching transcript from YouTube video...");

  try {
    const transcription = await fetchTranscript(videoUrl);
    const summaryLength = lengthOption?.toString().toLowerCase() || "short";

    if (!validateLength(lengthOption, summaryLength)) {
      Deno.exit(1);
    }

    console.log("\x1b[36m%s\x1b[0m", `Using summary length: ${summaryLength}`);
    // deno-lint-ignore no-unused-vars
    const summary = await generateSummary(transcription, summaryLength, model, title, creator);
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Failed to process transcript:", error);
  }
}

async function main() {
  const args = parse(Deno.args);
  let model = "llama3.2:latest";

  if (args.help || args.h) {
    printHelp();
    Deno.exit(0);
  }

  if (args.model) model = args.model;

  if (!args.video) {
    console.log("\x1b[33m%s\x1b[0m", "Please provide a YouTube video URL with --video");
    console.log("\x1b[36m%s\x1b[0m", "Use --help for more information");
    return;
  }

  try {
    const { title, creator } = await fetchVideoMetadata(args.video);
    console.log("\x1b[36m%s\x1b[0m", `Video title: ${title}`);
    console.log("\x1b[36m%s\x1b[0m", `Creator: ${creator}`);

    await processSummary(args.video, args.length, model, title, creator);
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "Failed to fetch video metadata:", error);

    // Continue without metadata
    await processSummary(args.video, args.length, model);
  }
}

if (import.meta.main) {
  main();
}