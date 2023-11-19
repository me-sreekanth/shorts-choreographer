const fs = require("fs");
const path = require("path");
const fsPromises = require("fs").promises;
const { sendRequest, fetchStatus } = require("../services/generateImageApi");
// Directories
const OUTPUT_DIRECTORY = path.join(__dirname, "..", "data", "output", "scenes");

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

    // Iterate over the scenes and send API request for each, excluding the last scene
    for (let i = 0; i < scenes.length; i++) {
      let scene = scenes[i];
      console.log("Scene: ", scene);
      const sceneNumber = scene.SceneNumber;
      const isLastScene = i === scenes.length - 1;

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
        const destPath = path.join(
          OUTPUT_DIRECTORY,
          `${sceneNumber}-scene.png`
        );
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
        const responseData = await sendRequest(scene);
        if (responseData && responseData.data.process_id) {
          await fetchStatus(responseData.data.process_id, scene); // Pass scene object here
        }
      }
    }
  } catch (error) {
    console.error("Error generating images:", error);
  }
};

(async () => {
  try {
    await generateImagesForScenes();
  } catch (error) {
    console.error("Error generating images:", error);
  }
})();

module.exports = {
  generateImagesForScenes,
};
