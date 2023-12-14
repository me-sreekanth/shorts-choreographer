// index.js
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const extractAudioAndTranscribeToJson = (videoPath) => {
  return new Promise((resolve, reject) => {
    const audioPath = videoPath.replace(/\.[^/.]+$/, "") + ".wav";
    const jsonFilePath = videoPath.replace(/\.[^/.]+$/, "") + ".json";
    const transcriptionScriptPath = path.join(
      __dirname,
      "whisper_transcribe.py"
    );

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
          `python3 "${transcriptionScriptPath}" "${audioPath}" "${jsonFilePath}"`,
          (err, stdout, stderr) => {
            if (err) {
              console.error("Error in transcription:", err);
              reject(err);
            } else {
              console.log("Transcription and JSON file generation completed.");
              resolve(jsonFilePath);
            }
          }
        );
      }
    );
  });
};

const videoPath = path.join(__dirname, "../data/output/final_output.mp4"); // Replace with the path to your video file
extractAudioAndTranscribeToJson(videoPath)
  .then((jsonFilePath) =>
    console.log(`JSON script created at: ${jsonFilePath}`)
  )
  .catch((error) => console.error("An error occurred:", error));
