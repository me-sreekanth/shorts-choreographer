const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDirectory = path.join(__dirname, "..", "data", "output");
const scenesDirectory = path.join(outputDirectory, "scenes");
const voiceoversDirectory = path.join(outputDirectory, "voiceovers");
const videoOutputPath = path.join(outputDirectory, "final_video.mp4");
const videosAndScenes = require("../data/input/videos-and-scenes-data.json");
const colors = ["white", "yellow"];

// Function to get the duration of an MP3 file
const getDuration = (filePath) => {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  return parseFloat(execSync(command).toString().trim());
};

// Function to create a video clip from an image, add text with animations and set duration
const createVideoClipWithTextAndAudio = (
  imagePath,
  text,
  audioPath,
  duration, // Make sure this is the duration of the audio file
  sceneNumber
) => {
  const videoClipPath = path.join(
    outputDirectory,
    `${sceneNumber}-scene-with-text.mp4`
  );

  const fontPath = path.join(
    __dirname,
    "..",
    "data",
    "input",
    "fonts",
    "Bangers-Regular.ttf"
  ); // Ensure this path is correct
  const fontSize = 75; // Increase this value to make the font larger
  const textChunks = text.split(" "); // Split the text into chunks (simplified example)
  let drawTextFilter = "";
  let startTime = 0;

  // Create drawtext filter string for each chunk
  textChunks.forEach((chunk, index) => {
    // For simplicity, this example will show each word for an equal portion of the duration
    const endTime = startTime + duration / textChunks.length;
    const color = colors[index % colors.length].toUpperCase(); // Cycle through colors
    drawTextFilter += `drawtext=text='${chunk.toUpperCase()}':fontcolor=${color}:fontsize=${fontSize}:fontfile='${fontPath}':borderw=1:bordercolor=black:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${startTime},${endTime})',`;
    startTime = endTime; // Update startTime for the next chunk
  });

  // Remove the trailing comma from the filter chain
  drawTextFilter = drawTextFilter.replace(/,$/, "");

  // Assuming a frame rate of 25 fps, calculate the number of frames for the entire duration
  const frameRate = 25; // Change this according to your actual frame rate
  const totalFrames = Math.ceil(duration * frameRate);

  // Apply the zoom effect over the total number of frames
  const zoomEffect = `zoompan=z='min(zoom+0.0015,1.5)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=768x1024:fps=${frameRate}`;

  // Combine the zoom effect with the text filters
  const filters = `${zoomEffect},${drawTextFilter}`;
  const filtered = filters.slice(0, -1); // Remove the trailing comma

  const command = `ffmpeg -y -loop 1 -i "${imagePath}" -i "${audioPath}" -filter_complex "${filtered}" -t ${duration} -c:v libx264 -c:a aac -strict experimental "${videoClipPath}"`;
  execSync(command);

  return videoClipPath;
};

// Function to concatenate video clips with voiceovers
const concatenateClipsWithAudio = (videoClips) => {
  const fileListPath = path.join(outputDirectory, "file_list.txt");
  const fileListContent = videoClips.map((file) => `file '${file}'`).join("\n");
  fs.writeFileSync(fileListPath, fileListContent);

  // Command that re-encodes the streams
  const command = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k "${videoOutputPath}"`;
  execSync(command);

  // Clean up
  fs.unlinkSync(fileListPath);
};

// Main function to generate the final video
const generateVideo = async () => {
  const videoClips = [];
  for (const scene of videosAndScenes.Scenes) {
    const sceneNumber = scene.SceneNumber;
    const imagePath = path.join(scenesDirectory, `${sceneNumber}-scene.png`);
    const text = scene.Text; // This is the text you want to overlay
    const audioPath = path.join(
      voiceoversDirectory,
      `${sceneNumber}-scene-voiceover.mp3`
    );
    const duration = getDuration(audioPath); // Calculate the duration of the voiceover

    const videoClipPath = createVideoClipWithTextAndAudio(
      imagePath,
      text,
      audioPath,
      duration, // Pass the calculated duration here
      sceneNumber
    );
    videoClips.push(videoClipPath);
  }

  concatenateClipsWithAudio(videoClips);
  console.log(`Generated video is available at: ${videoOutputPath}`);
};

const clearOutputDirectory = () => {
  const files = fs.readdirSync(outputDirectory);
  for (const file of files) {
    if (file.endsWith(".mp4") || file === "file_list.txt") {
      fs.unlinkSync(path.join(outputDirectory, file));
    }
  }
};

// Call this before generateVideo()
clearOutputDirectory();
generateVideo().catch((error) => console.error(error));
