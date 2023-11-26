const execSync = require("child_process").execSync;
const args = process.argv.slice(2); // Get command-line arguments
console.log('Received arguments:', args);

// Function to check if a step should be executed
const shouldRunStep = (step) => {
  const shouldRun = args.includes(step);
  console.log(`Should run step '${step}': ${shouldRun}`);
  return args.length === 0 || args.includes(`--${step}`);
};

try {
  // Run the generateSceneImages.js script and wait for it to finish
  if (shouldRunStep('images')) {
    console.log("Starting scene image generation...");
    execSync("node ./src/ai-generator/generateImages.js", { stdio: "inherit" });
  }

    // After the above script completes, run the generateVoiceovers.js script
  if (shouldRunStep('voiceovers')) {
    console.log("Starting voiceover generation...");
    execSync("node ./src/ai-generator/generateVoiceovers.js", { stdio: "inherit" });
  }

  // Finally, run the generateVideo.js script
  if (shouldRunStep('video')) {
    console.log("Starting video generation...");
    execSync("node ./src/ai-generator/generateVideo.js", { stdio: "inherit" });
  }

  // Generate transcription
  if (shouldRunStep('transcription')) {
    console.log("Starting voiceover generation...");
    execSync("node ./src/ai-generator/generateTranscription.js", { stdio: "inherit" });
  }

  //Upload the generated shorts video to YouTube
  if (shouldRunStep('upload')) {
    console.log("Uploading video to YouTube...");
    execSync("node ./src/scripts/uploadVideo.js", { stdio: "inherit" });
  }

  console.log("Selected processes completed successfully.");
} catch (error) {
  console.error("An error occurred while generating content:", error);
}
