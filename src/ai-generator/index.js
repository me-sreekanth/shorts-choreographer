const execSync = require("child_process").execSync;

try {
  // Run the generateSceneImages.js script and wait for it to finish
  console.log("Starting scene image generation...");
  execSync("node ./src/ai-generator/generateImages.js", {
    stdio: "inherit",
  });

  // After the above script completes, run the generateVoiceovers.js script
  console.log("Starting voiceover generation...");
  execSync("node ./src/ai-generator/generateVoiceovers.js", {
    stdio: "inherit",
  });

  // Finally, run the generateVideo.js script
  console.log("Starting video generation...");
  execSync("node ./src/ai-generator/generateVideo.js", { stdio: "inherit" });

  // Generate transcription
  console.log("Starting transcription...");
  execSync("node ./src/ai-generator/generateTranscription.js", {
    stdio: "inherit",
  });

  //Upload the generated shorts video to YouTube
  // console.log("Uploading video to YouTube...");
  // execSync("node ./src/scripts/uploadVideo.js", { stdio: "inherit" });

  console.log("All processes completed successfully.");
} catch (error) {
  console.error("An error occurred while generating content:", error);
}
