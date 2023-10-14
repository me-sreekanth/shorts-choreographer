const axios = require("axios");
require("dotenv").config();

const BEARER_TOKEN = process.env.BEARER_TOKEN;

// Function to send a request for image data
const sendRequest = async (BEARER_TOKEN) => {
  const data = {
    model: "sdxl-base",
    data: {
      negprompt: "unreal,fake,meme,joke,disfigured,poor quality,bad,ugly",
      samples: 1,
      steps: 50,
      aspect_ratio: "portrait",
      guidance_scale: 12.5,
      seed: 8265801,
      prompt:
        "Saturn, with its celestial rings of ice and rock, poses for Voyager's lens, a moment frozen in cosmic time.",
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
    const response = await axios(config);
    console.log(response.data);
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

// Function to fetch request status
const fetchStatus = async (process_id, BEARER_TOKEN) => {
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

    if (response.data.data.data.status === "IN_PROGRESS") {
      setTimeout(() => {
        fetchStatus(process_id, BEARER_TOKEN);
      }, 2000);
    }

    console.log("fetchStatus :: ", response.data);
    console.log("Result :: ", JSON.stringify(response.data.data.data.result));
  } catch (error) {
    console.error(error);
  }
};

// Example usage
(async () => {
  const responseData = await sendRequest(BEARER_TOKEN);
  setTimeout(() => responseData);
  if (responseData && responseData.data.process_id) {
    await fetchStatus(responseData.data.process_id, BEARER_TOKEN);
  }
})();
