async function bundle() {
  console.log("Bundling extension files...");

  await Deno.mkdir("./extension/dist", { recursive: true });

  try {
    // Import esbuild
    const esbuild = await import("https://deno.land/x/esbuild/mod.js");

    // Bundle with esbuild
    const result = await esbuild.build({
      entryPoints: ["extension/content.js"],
      outfile: "extension/dist/content.js",
      bundle: true,
      format: "esm",
      target: "es2020",
      minify: false
    });

    esbuild.stop();
    console.log("Bundle completed successfully!");
  } catch (error) {
    console.error("Bundle failed:", error);
    Deno.exit(1);
  }
}

await bundle();