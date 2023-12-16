const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDirectory = path.join(__dirname, "..", "data", "output");
const scenesDirectory = path.join(outputDirectory, "scenes");
const voiceoversDirectory = path.join(outputDirectory, "voiceovers");
const videoOutputPath = path.join(outputDirectory, "final_video.mp4");
const videosAndScenes = require("../data/input/videos-and-scenes-data.json");

const getDuration = (filePath) => {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  return parseFloat(execSync(command).toString().trim());
};

const getRandomEffect = () => {
  const effects = ["zoompan", "horizontal_pan", "vertical_pan"]; // Add more effects as needed
  const randomIndex = Math.floor(Math.random() * effects.length);
  return effects[randomIndex];
};

const getVerticalPanFilter = (imageHeight, duration) => {
  const moveAmount = imageHeight - 1920; // Assuming a target height of 1920
  const moveRate = moveAmount / (duration * 50); // 50 fps
  return `[0:v]crop=1080:1920:0:${moveRate}*n[panned]; [panned]scale=1440:1920[scaled]; [2:v]scale=200:-1[wm]; [scaled][wm]overlay=10:10`;
};

const getHorizontalPanFilter = (imageWidth, duration) => {
  const moveAmount = imageWidth - 1080; // Assuming a target width of 1080
  const moveRate = moveAmount / (duration * 50); // 50 fps
  return `[0:v]crop=1080:1920:${moveRate}*n:0[panned]; [panned]scale=1440:1920[scaled]; [2:v]scale=200:-1[wm]; [scaled][wm]overlay=10:10`;
};

const createVideoClipWithTextAudioAndSubtitles = (
  imagePath,
  audioPath,
  duration,
  sceneNumber
) => {
  const watermarkPath = path.join(
    __dirname,
    "..",
    "data",
    "output",
    "watermarks",
    "code_worthy_channel_logo.png"
  );

  if (!fs.existsSync(watermarkPath)) {
    throw new Error(`Watermark file not found at path: ${watermarkPath}`);
  }

  const effect = getRandomEffect();
  let filters;

  switch (effect) {
    case "zoompan":
      filters = `[0:v]fps=50,zoompan=z='min(zoom+0.001,1.5)':d=391:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=768x1024, scale=1440:1920, crop=1080:1920:((1440-1080)/2):0`;
      break;
    case "horizontal_pan":
      // Assuming imageWidth is 1440, adjust as necessary
      filters = getHorizontalPanFilter(1440, duration);
      break;
    case "vertical_pan":
      // Assuming imageHeight is 1920, adjust as necessary
      filters = getVerticalPanFilter(1920, duration);
      break;
    // Add more cases for additional effects
  }

  // Add watermark overlay
  filters += `, scale=200:-1 [wm]; [wm]overlay=10:10`;

  const intermediateVideoClipPath = path.join(
    outputDirectory,
    `${sceneNumber}-intermediate-scene.mp4`
  );
  const videoClipPath = path.join(
    outputDirectory,
    `${sceneNumber}-scene-with-text.mp4`
  );

  try {
    const ffmpegCommand = `ffmpeg -y -i "${imagePath}" -i "${audioPath}" -i "${watermarkPath}" -filter_complex "${filters}" -map 0:v -map 1:a -pix_fmt yuv420p -c:v libx264 -r 50 -t ${duration} "${intermediateVideoClipPath}"`;
    console.log("FFmpeg command:", ffmpegCommand);
    execSync(ffmpegCommand);
    execSync(
      `ffmpeg -y -i "${intermediateVideoClipPath}" -c:v libx264 -c:a copy "${videoClipPath}"`
    );
  } catch (error) {
    console.error("Error executing FFmpeg command:", error);
    throw error;
  }

  return videoClipPath;
};

const concatenateClipsWithAudio = (videoClips) => {
  const fileListPath = path.join(outputDirectory, "file_list.txt");
  fs.writeFileSync(
    fileListPath,
    videoClips.map((file) => `file '${file}'`).join("\n")
  );
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k "${videoOutputPath}"`
  );
  fs.unlinkSync(fileListPath);
};

const addBackgroundMusic = (finalVideoPath, backgroundAudioPath) => {
  const outputVideoPath = path.join(
    outputDirectory,
    "final_video_with_music.mp4"
  );
  execSync(
    `ffmpeg -y -i "${finalVideoPath}" -i "${backgroundAudioPath}" -filter_complex "[1:a]volume=0.2[background];[0:a][background]amix=inputs=2:duration=first[audio]" -map 0:v -map "[audio]" -c:v copy -c:a aac -shortest "${outputVideoPath}"`
  );
  return outputVideoPath;
};

const generateVideo = async () => {
  try {
    clearOutputDirectory();
    const videoClips = videosAndScenes.Scenes.map((scene) => {
      const imagePath = path.join(
        scenesDirectory,
        `${scene.SceneNumber}-scene.png`
      );
      const audioPath = path.join(
        voiceoversDirectory,
        `${scene.SceneNumber}-scene-voiceover.mp3`
      );
      const duration = getDuration(audioPath);
      return createVideoClipWithTextAudioAndSubtitles(
        imagePath,
        audioPath,
        duration,
        scene.SceneNumber
      );
    });

    concatenateClipsWithAudio(videoClips);
    const finalVideoPathWithMusic = addBackgroundMusic(
      videoOutputPath,
      path.join(
        __dirname,
        "..",
        "data",
        "input",
        "audio",
        "background-audio.mp3"
      )
    );
    console.log(
      `Generated video with music is available at: ${finalVideoPathWithMusic}`
    );
  } catch (error) {
    console.error("Error generating video:", error);
  }
};

const clearOutputDirectory = () => {
  fs.readdirSync(outputDirectory).forEach((file) => {
    if (file.endsWith(".mp4") || file === "file_list.txt") {
      fs.unlinkSync(path.join(outputDirectory, file));
    }
  });
};

generateVideo();
