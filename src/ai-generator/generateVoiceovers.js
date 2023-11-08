require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Load your videos-and-scenes-data.json
const videosAndScenes = require("../data/input/videos-and-scenes-data.json");

const voiceID = "pNInz6obpgDQGcFmaJgB"; // Use the voice ID you choose
const apiKey = process.env.VOICEOVER_API_KEY; // Your API key is read from .env
const outputDirectory = path.join(
  __dirname,
  "..",
  "data",
  "output",
  "voiceovers"
);

// Ensure the output directory exists
if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

// Function to make the API call and save the file
const generateVoiceOver = async (text, sceneNumber) => {
  const config = {
    method: "post",
    url: `https://api.elevenlabs.io/v1/text-to-speech/${voiceID}?optimize_streaming_latency=0&output_format=mp3_44100_128`,
    headers: {
      accept: "audio/mpeg",
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    data: {
      text: text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0,
        similarity_boost: 0,
        style: 0,
        use_speaker_boost: true,
      },
    },
    responseType: "stream",
  };

  try {
    const response = await axios(config);
    const fileName = `${sceneNumber}-scene-voiceover.mp3`;
    const filePath = path.join(outputDirectory, fileName);
    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);
      writer.on("finish", () => resolve(filePath));
      writer.on("error", reject);
    });
    return filePath;
  } catch (error) {
    console.error(`Error making API request for scene ${sceneNumber}:`, error);
    throw error; // Re-throw the error to be caught by the caller
  }
};

const addSilence = (filePath) => {
  return new Promise((resolve, reject) => {
    // Generate 0.5 seconds of silence and save as a temporary file
    const silenceFile = `${filePath.replace(".mp3", "_silence.mp3")}`;
    const tempFilePath = `${filePath.replace(".mp3", "_temp.mp3")}`;

    const generateSilenceCommand = `ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 0.5 ${silenceFile}`;
    exec(generateSilenceCommand, (silenceError, stdout, stderr) => {
      if (silenceError) {
        console.error("Error generating silence:", stderr);
        return reject(silenceError);
      }
      // Concatenate the silence to the start and end of the audio file
      const ffmpegCommand = `ffmpeg -i "concat:${silenceFile}|${filePath}|${silenceFile}" -acodec copy ${tempFilePath}`;

      exec(ffmpegCommand, (error, stdout, stderr) => {
        if (error) {
          console.error("Error adding silence:", stderr);
          return reject(error);
        }
        fs.unlinkSync(silenceFile); // Delete the temporary silence file

        // Replace the original file with the new file that has silence added
        fs.rename(tempFilePath, filePath, (renameError) => {
          if (renameError) {
            console.error("Error moving file:", renameError);
            return reject(renameError);
          }
          resolve(filePath);
        });
      });
    });
  });
};

// Iterate over each scene and generate voiceovers
const generateAllVoiceOvers = async () => {
  for (const scene of videosAndScenes.Scenes) {
    const sceneNumber = scene.SceneNumber; // Ensure scope of sceneNumber
    try {
      const filePath = await generateVoiceOver(
        scene.VoiceOverText,
        sceneNumber
      );
      if (filePath) {
        await addSilence(filePath);
        console.log(
          `Generated voiceover with silence for scene ${sceneNumber}`
        );
      } else {
        console.error(`Failed to generate voiceover for scene ${sceneNumber}`);
      }
    } catch (error) {
      console.error(`Error processing scene ${sceneNumber}:`, error);
    }
  }
};

module.exports = {
  generateAllVoiceOvers,
};
// generateAllVoiceOvers();
