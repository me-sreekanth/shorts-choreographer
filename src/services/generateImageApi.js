const axios = require("axios");
const fs = require("fs");
const { generateAllVoiceOvers } = require("../ai-generator/generateVoiceovers");
require("dotenv").config();

const BEARER_TOKEN = process.env.BEARER_TOKEN;
let COMPLETED = 0;

// Function to send a request for image data
const sendRequest = async (scene) => {
  const data = {
    model: "sdxl-base",
    data: {
      negprompt: "unreal,fake,meme,joke,disfigured,poor quality,bad,ugly",
      samples: 1,
      steps: 50,
      aspect_ratio: "portrait",
      guidance_scale: 20,
      seed: 8265801,
      prompt: scene.Description, // This uses the Description key as intended
      style: "realism",
    },
  };

  const config = {
    method: "post",
    url: "https://monsterapi.ai/backend/v2playground/generate/processId",
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(data),
  };

  try {
    console.log("Generating image for : ", scene.Description);
    const response = await axios(config);

    return response.data;
  } catch (error) {
    console.error(error);
  }
};

// Function to fetch request status
const fetchStatus = async (process_id, scene, totalScenes) => {
  console.log("Completed", COMPLETED);
  const payload = {
    process_id: process_id,
  };

  const config = {
    method: "post",
    url: `https://monsterapi.ai/backend/v2playground/check-status`,
    headers: {
      Authorization: `Bearer ${BEARER_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: JSON.stringify(payload),
  };

  try {
    const response = await axios(config);

    if (
      response.data.data.data.status === "IN_PROGRESS" ||
      response.data.data.data.status === "IN_QUEUE"
    ) {
      setTimeout(async () => {
        await fetchStatus(process_id, scene, totalScenes);
      }, 10000);
    }

    // Check if the status is done and if an image URL is available
    if (
      response.data.data.data.status === "COMPLETED" &&
      response.data.data.data.result
    ) {
      console.log("DONE : ", response.data);
      const imageUrl = response.data.data.data.result.output[0];
      const sanitizedDescription = scene.Description.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      );

      const imageStream = fs.createWriteStream(
        `src/data/output/scenes/${scene.SceneNumber}-scene.png`
      );

      const imageResponse = await axios.get(imageUrl, {
        responseType: "stream",
      });
      imageResponse.data.pipe(imageStream);
      COMPLETED += 1;
      if (COMPLETED === totalScenes) {
        generateAllVoiceOvers();
      }
    } else if (response.data.data.data.status === "FAILED") {
      console.log("FAILED:", scene.SceneNumber);
      const res = await sendRequest(scene);
    }

    console.log("fetchStatus :: ", response.data);
    console.log("Result :: ", JSON.stringify(response.data.data.data.result));
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  sendRequest,
  fetchStatus,
};
