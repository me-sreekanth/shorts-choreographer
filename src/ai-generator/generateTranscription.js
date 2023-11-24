const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const videoPath =
  "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/final_video_with_music.mp4";

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
        const transcriptionScriptPath =
          "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/ai-generator/scripts/whisper_transcribe.py";
        const assFilePath =
          "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/output.ass";
        exec(
          `python3 "${transcriptionScriptPath}" "${audioPath}" "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/output.ass"`,
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
    exec(
      `ffmpeg -y -i "${videoPath}" -vf "ass=${subtitlesPath}" -c:v libx264 -c:a aac "${outputPath}"`,
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error in overlaying subtitles:", err);
          console.error("ffmpeg stderr:", stderr);
          reject(err);
          return;
        }
        console.log("ffmpeg stdout:", stdout);
        console.log("Subtitles overlay completed.");
        resolve();
      }
    );
  });
}

extractAudioAndTranscribe(videoPath)
  .then(() =>
    overlaySubtitles(
      videoPath,
      "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/output.ass",
      "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/final_output.mp4"
    )
  )
  .catch((error) => {
    console.error("Error:", error);
  });
