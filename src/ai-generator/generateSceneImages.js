require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const fsPromises = require("fs").promises;

// Directories
const OUTPUT_DIRECTORY = path.join(__dirname, "..", "data", "output", "scenes");
const INPUT_JSON = path.join(
  __dirname,
  "..",
  "data",
  "input",
  "videos-and-scenes-data.json"
);

// Monster API credentials
const BEARER_TOKEN = process.env.BEARER_TOKEN;
const API_ENDPOINT = "https://api.monsterapi.ai/v1/generate/txt2img";
const STATUS_ENDPOINT = "https://api.monsterapi.ai/v1/status";

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIRECTORY)) {
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
}

// Function to generate image
const generateImage = async (description, sceneNumber, retries = 3) => {
  try {
    const formData = new FormData();
    formData.append("prompt", description);
    formData.append("aspect_ratio", "portrait");
    formData.append("guidance_scale", "12.5");

    const response = await axios.post(API_ENDPOINT, formData, {
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Accept: "application/json",
        ...formData.getHeaders(),
      },
    });

    if (response.data && response.data.status_url) {
      return checkImageStatus(response.data.status_url, sceneNumber, retries);
    }
  } catch (error) {
    if (retries > 0) {
      console.error(
        `Error during image generation for scene ${sceneNumber}: Retrying...`
      );
      await new Promise((r) => setTimeout(r, 10000)); // 10 seconds delay before retry
      return generateImage(description, sceneNumber, retries - 1);
    } else {
      console.error(
        `Failed to generate image for scene ${sceneNumber} after maximum retries.`
      );
      return { success: false, error: error.message };
    }
  }
};

// Function to check image status with retries
const checkImageStatus = async (statusUrl, sceneNumber, retries) => {
  try {
    while (retries > 0) {
      const response = await axios.get(statusUrl, {
        headers: {
          Authorization: `Bearer ${BEARER_TOKEN}`,
          Accept: "application/json",
        },
      });

      if (response.data && response.data.status === "COMPLETED") {
        const imageUrl = response.data.result.output[0];
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
        });
        fs.writeFileSync(
          path.join(OUTPUT_DIRECTORY, `${sceneNumber}-scene.png`),
          imageResponse.data
        );
        console.log(`Image for scene ${sceneNumber} saved.`);
        return { success: true };
      } else if (response.data.status === "FAILED") {
        if (retries > 0) {
          console.error(
            `Image generation failed for scene ${sceneNumber}: Retrying...`
          );
          await new Promise((r) => setTimeout(r, 10000)); // 10 seconds delay before retry
          retries--;
          continue;
        } else {
          console.error(
            `Failed to generate image for scene ${sceneNumber} after maximum retries.`
          );
          return { success: false };
        }
      } else {
        // Wait for a while before checking the status again
        await new Promise((r) => setTimeout(r, 10000)); // 10 seconds delay
      }
    }
    return {
      success: false,
      status: "Maximum retries reached without completion.",
    };
  } catch (error) {
    console.error(
      `Error checking image status for scene ${sceneNumber}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

// Function to process and generate or copy images for all scenes
const processScenes = async (scenesData) => {
  for (let i = 0; i < scenesData.Scenes.length; i++) {
    const scene = scenesData.Scenes[i];
    const sceneNumber = scene.SceneNumber;
    const isLastScene = i === scenesData.Scenes.length - 1;

    if (isLastScene) {
      // If it's the last scene, copy the existing last_scene.png
      const sourcePath = path.join(
        __dirname,
        "..",
        "data",
        "output",
        "scenes",
        "last_scene.png"
      );
      const destPath = path.join(OUTPUT_DIRECTORY, `${sceneNumber}-scene.png`);
      try {
        await fsPromises.copyFile(sourcePath, destPath);
        console.log(
          `Image for last scene (Scene ${sceneNumber}) copied to ${destPath}`
        );
      } catch (error) {
        console.error(
          `Error copying image for last scene (Scene ${sceneNumber}):`,
          error
        );
      }
    } else {
      // Otherwise, generate a new image
      console.log(`Generating image for Scene ${sceneNumber}`);
      await generateImage(scene.Description, sceneNumber);
    }
  }
};

// Read JSON data and start the image generation process
const jsonData = JSON.parse(fs.readFileSync(INPUT_JSON, "utf-8"));
processScenes(jsonData).catch(console.error);
