const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

// Define base directories
const baseDir = path.join(__dirname, "..", ".."); // Adjust as needed
const dataOutputDir = path.join(baseDir, "src", "data", "output");
const aiGeneratorScriptsDir = path.join(baseDir, "src", "ai-generator", "scripts");

// File paths
const videoPath = path.join(dataOutputDir, "final_video_with_music.mp4");
const transcriptionScriptPath = path.join(aiGeneratorScriptsDir, "whisper_transcribe.py");
const assFilePath = path.join(dataOutputDir, "output.ass");
const finalOutputPath = path.join(dataOutputDir, "final_output.mp4");

function extractAudioAndTranscribe(videoPath) {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(/\.[^/.]+$/, "") + ".wav";
    console.log(`Extracting audio from: ${videoPath}`);

    exec(
      `ffmpeg -y -i "${videoPath}" -acodec pcm_s16le -ar 16000 "${audioPath}"`,
      (err) => {
        if (err) {
          console.error("Error in extracting audio:", err);
          reject(err);
          return;
        }

        console.log("Audio extracted, starting transcription...");

        exec(
          `python3 "${transcriptionScriptPath}" "${audioPath}" "${assFilePath}"`,
          (err) => {
            if (err) {
              console.error("Error in transcription:", err);
              reject(err);
            } else {
              console.log("Transcription completed.");
              resolve();
            }
          }
        );

        console.log("Checking if ASS file is created...");
        fs.access(assFilePath, fs.constants.F_OK, (err) => {
          if (err) {
            console.error("ASS file not found:", err);
          } else {
            console.log("ASS file exists. Proceeding to overlay subtitles...");
          }
        });
      }
    );
  });
}

function overlaySubtitles(videoPath, subtitlesPath, outputPath) {
  return new Promise((resolve, reject) => {
    // Escape backslashes and the colon for the subtitles path
    const escapedSubtitlesPath = subtitlesPath.replace(/\\/g, '\\\\\\').replace(':', '\\:');

    // Update the command to use the 'subtitles' filter
    const command = `ffmpeg -y -i "${videoPath}" -vf "subtitles='${escapedSubtitlesPath}'" -c:v libx264 -c:a aac "${outputPath}"`;

    console.log(`Executing command: ${command}`);

    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error("Error in overlaying subtitles:", err);
        console.error("ffmpeg stderr:", stderr);
        reject(err);
        return;
      }
      console.log("ffmpeg stdout:", stdout);
      console.log("Subtitles overlay completed.");
      resolve();
    });
  });
}



setTimeout(() => {
  console.log("Generating Transcription. .");
  extractAudioAndTranscribe(videoPath)
    .then(() => overlaySubtitles(videoPath, assFilePath, finalOutputPath))
    .catch((error) => console.error("Error:", error));
}, 2000);

