const fs = require("fs");
const { sendRequest, fetchStatus } = require("../services/generateImageApi");

const readFileAsync = (path, encoding) => {
  return new Promise((resolve, reject) => {
    fs.readFile(path, encoding, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const generateImagesForScenes = async () => {
  try {
    // Read the JSON file
    const data = await readFileAsync(
      "src/data/input/videos-and-scenes-data.json",
      "utf-8"
    );
    const jsonData = JSON.parse(data);

    // Extract the scenes
    const scenes = jsonData.Scenes;

    // Iterate over the scenes and send API request for each
    for (let scene of scenes) {
      console.log("Scene: ", scene);
      const responseData = await sendRequest(scene);

      if (responseData && responseData.data.process_id) {
        await fetchStatus(responseData.data.process_id, scene); // Pass scene object here
      }
    }
  } catch (error) {
    console.error("Error generating images:", error);
  }
};

module.exports = {
  generateImagesForScenes,
};
