const speech = require("@google-cloud/speech");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const ffmpegPath = require("ffmpeg-static");
const path = require("path");

// Configure FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

// Initialize Google Cloud Speech-to-Text client
const client = new speech.SpeechClient({
  keyFilename:
    "/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/ai-generator/rouge-ai-service-account-speech-to-text.json",
});

// Function to convert MP3 to FLAC (Google Speech-to-Text prefers FLAC)
function convertMp3ToFlac(source, target, callback) {
  ffmpeg(source)
    .audioFrequency(44100) // Ensure this matches the desired sample rate
    .toFormat("flac")
    .on("end", function () {
      console.log("Conversion finished.");
      callback();
    })
    .on("error", function (err) {
      console.log("Error:", err);
    })
    .save(target);
}

// Function to transcribe FLAC file
// Function to transcribe FLAC file
async function transcribeAudio(fileName) {
  const file = fs.readFileSync(fileName);
  const audioBytes = file.toString("base64");

  const request = {
    audio: {
      content: audioBytes,
    },
    config: {
      encoding: "FLAC",
      sampleRateHertz: 44100,
      languageCode: "en-US",
      audioChannelCount: 2,
      enableSeparateRecognitionPerChannel: true, // Consider setting to false if audio is identical in both channels
      enableWordTimeOffsets: true,
    },
  };

  const [response] = await client.recognize(request);
  const seenSubtitles = new Set();
  const subtitles = [];
  response.results.forEach((result) => {
    result.alternatives[0].words.forEach((word) => {
      const start = word.startTime;
      const end = word.endTime;
      const text = word.word;
      const subtitle = `${formatTime(start)} --> ${formatTime(end)}\n${text}`;

      // Check for duplicates
      if (!seenSubtitles.has(subtitle)) {
        seenSubtitles.add(subtitle);
        subtitles.push(subtitle);
      }
    });
  });

  return subtitles.join("\n");
}

// Helper function to format time for SRT
function formatTime(duration) {
  const seconds = duration.seconds || 0;
  const nanos = duration.nanos || 0;
  const totalSeconds = seconds + nanos / 1e9;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${remainingSeconds.toFixed(3).replace(".", ",")}`;
}

// Main process
const mp3File = path.join(
  __dirname,
  "../data/output/voiceovers/1-scene-voiceover.mp3"
);
const flacFile = path.join(
  __dirname,
  "../data/output/voiceovers/temp_audio.flac"
);

convertMp3ToFlac(mp3File, flacFile, async () => {
  const srtContent = await transcribeAudio(flacFile);
  fs.writeFileSync("output.srt", srtContent);
  console.log("SRT file created successfully.");
});
