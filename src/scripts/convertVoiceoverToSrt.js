const fs = require("fs");
const path = require("path");
const speech = require("@google-cloud/speech");
const client = new speech.SpeechClient();

async function transcribeAudio(filePath) {
  const audio = {
    content: fs.readFileSync(filePath).toString("base64"),
  };

  const config = {
    encoding: "LINEAR16", // Update according to your audio file format
    sampleRateHertz: 16000, // Update according to your audio file
    languageCode: "en-US", // Set to the language of your audio
  };

  const request = {
    audio: audio,
    config: config,
  };

  const [response] = await client.recognize(request);
  return response.results.map((result) => ({
    text: result.alternatives[0].transcript,
    startTime:
      result.resultStartTime.seconds + result.resultStartTime.nanos * 1e-9,
    endTime: result.resultEndTime.seconds + result.resultEndTime.nanos * 1e-9,
  }));
}

function generateSrtContent(transcription) {
  return transcription
    .map((item, index) => {
      const startTime = formatTime(item.startTime);
      const endTime = formatTime(item.endTime);
      return `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n`;
    })
    .join("\n");
}

function formatTime(seconds) {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 12).replace(".", ",");
}

async function createSrtFromMp3(mp3FilePath) {
  const transcription = await transcribeAudio(mp3FilePath);
  const srtContent = generateSrtContent(transcription);
  fs.writeFileSync(path.join(__dirname, "output.srt"), srtContent);
}

// Use the __dirname to construct the full path
const mp3FilePath = path.join(
  __dirname,
  "src/data/output/voiceovers/1-scene-voiceover.mp3"
);
createSrtFromMp3(mp3FilePath).catch(console.error);
