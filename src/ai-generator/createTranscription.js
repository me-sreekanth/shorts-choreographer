console.log("Starting Node.js Script Execution");
const { spawnSync } = require("child_process");
const path = require("path");

// Define the path to the Python script
const pythonScript = path.join(__dirname, "transcribe.py");

// Define the path to the audio file
const audioFile = path.join(
  __dirname,
  "src",
  "data",
  "output",
  "final_video_with_music.wav"
);

// Run the Python script with the audio file as an argument
console.log("Running Python script...");
const pythonProcess = spawnSync("python", [pythonScript, audioFile]);
console.log("Python script executed.");

if (pythonProcess.error) {
  console.error("Error running Python script:", pythonProcess.error);
} else {
  console.log("Python script output:", pythonProcess.stdout.toString());
}
console.log("Node.js Script Execution Completed");
