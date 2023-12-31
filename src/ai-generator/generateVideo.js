const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDirectory = path.join(__dirname, "..", "data", "output");
const scenesDirectory = path.join(outputDirectory, "scenes");
const voiceoversDirectory = path.join(outputDirectory, "voiceovers");
const videoOutputPath = path.join(outputDirectory, "final_video.mp4");
const videosAndScenes = require("../data/input/videos-and-scenes-data.json");

// Function to get the duration of an MP3 file
const getDuration = (filePath) => {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  return parseFloat(execSync(command).toString().trim());
};

// Function to split text into lines with max 2-3 words per line
const splitTextIntoLines = (text, maxWordsPerLine = 2) => {
  const words = text.split(/\s+/);
  let lines = [];
  let currentLine = [];

  words.forEach((word) => {
    if (word.length > 4) {
      // If the word has more than 4 letters, start a new line
      if (currentLine.length > 0) {
        lines.push(currentLine.join(" "));
        currentLine = [];
      }
      lines.push(word);
    } else if (currentLine.length < maxWordsPerLine) {
      // Add word to the current line if it has space
      currentLine.push(word);
    } else {
      // Start a new line if the current line is full
      lines.push(currentLine.join(" "));
      currentLine = [word];
    }
  });

  // Add the last line if it contains any words
  if (currentLine.length > 0) {
    lines.push(currentLine.join(" "));
  }

  return lines;
};

// Function to create a video clip from an image, add text with animations and set duration
const createVideoClipWithTextAndAudio = (
  imagePath,
  text,
  audioPath,
  duration, // Make sure this is the duration of the audio file
  sceneNumber,
  backgroundAudioPath
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
    "impact.ttf"
  );
  const fontSize = 100;
  const videoWidth = 1080;
  const videoHeight = 1920; // Replace with your actual video height
  const lineHeight = fontSize * 1.5;
  const wordSpacing = 1;

  const calculateLineWidth = (line, fontSize) => {
    if (!Array.isArray(line)) {
      console.error("calculateLineWidth: Expected an array, got:", line);
      return 0;
    }

    let totalWidth = 0;
    line.forEach((word) => {
      totalWidth += measureWordWidth(word, fontSize);
    });
    return totalWidth;
  };

  // Function to estimate the width of a single word
  const measureWordWidth = (word, fontSize) => {
    const averageCharWidth = fontSize * 0.45; // Adjust this based on your specific font
    return word.length * averageCharWidth;
  };

  let lineSets = splitTextIntoLines(text);
  console.log("Line sets:", lineSets); // Check what lineSets contains
  if (!Array.isArray(lineSets)) {
    console.error(
      "Expected an array from splitTextIntoLines, received:",
      lineSets
    );
    return;
  }

  let drawTextFilters = [];
  const setDisplayDuration = duration / lineSets.length;

  // Calculate the total number of words
  const totalWordCount = lineSets.flat().reduce((total, line) => {
    return total + line.split(" ").length;
  }, 0);

  // Calculate the display duration for each word
  const wordDisplayDuration = duration / totalWordCount;
  lineSets.forEach((line, lineIndex) => {
    let words = line.split(" ");
    let totalLineWidth = calculateLineWidth(words, fontSize);
    let xPosStart =
      (videoWidth - totalLineWidth - wordSpacing * (words.length - 1)) / 2;
    let yPos = (videoHeight - lineHeight) / 2;

    let currentStartTime = lineIndex * setDisplayDuration;

    words.forEach((word, wordIndex) => {
      const wordDuration = wordDisplayDuration * word.split(" ").length;
      const wordEndTime = currentStartTime + wordDuration; // Define wordEndTime here

      const wordWidth = measureWordWidth(word, fontSize);
      const padding = 20; // Padding around the text
      const boxWidth = wordWidth + padding;
      const boxHeight = fontSize + padding - 6;
      const boxX = xPosStart - padding / 2;
      const boxY = yPos - padding / 2;

      const sanitizedWord = word.replace(/'/g, "'\\''");
      const color =
        word.length > 4 ? (Math.random() > 0.5 ? "yellow" : "red") : "white";

      // Draw semi-transparent black background box
      drawTextFilters.push(
        `drawbox=x=${boxX}:y=${boxY}:w=${boxWidth}:h=${boxHeight}:t=fill:color=black@0.5:enable='between(t,${currentStartTime},${wordEndTime})'`
      );

      // Center the text within the box
      const textX = boxX + (boxWidth - wordWidth) / 2;
      const textY = yPos;

      // Draw text
      drawTextFilters.push(
        `drawtext=text='${sanitizedWord}':fontcolor=${color}:fontsize=${fontSize}:fontfile='${fontPath}':x=${textX}:y=${textY}:enable='between(t,${currentStartTime},${wordEndTime})'`
      );

      xPosStart += wordWidth + wordSpacing;
      currentStartTime = wordEndTime; // Update currentStartTime for the next word
    });
  });

  const drawTextFilter = drawTextFilters.join(",");

  const adjustedDuration = Math.ceil(duration * 50); // Assuming duration is in seconds and fps is 50

  // Assuming your watermark image and desired video scale and crop values are correct
  const watermarkPath = path.join(
    __dirname,
    "..",
    "data",
    "output",
    "watermarks",
    "code_worthy_channel_logo.png"
  );

  // Ensure the watermark path exists
  if (!fs.existsSync(watermarkPath)) {
    throw new Error(`Watermark file not found at path: ${watermarkPath}`);
  }

  // Adjust the volume of the background music, 0.1 is 10% of the original volume
  const backgroundVolume = "0.1";

  // Modify the filter_complex part to include background music with adjusted volume
  const filters =
    `[0:v]fps=50,zoompan=z='min(zoom+0.001,1.5)':d=${adjustedDuration}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=768x1024[zoomed]; ` +
    `[zoomed]scale=1440:1920[scaled]; ` +
    `[scaled]crop=1080:1920:((1440-1080)/2):0[cropped]; ` +
    `[cropped]${drawTextFilter}[withText]; ` +
    `[1:v]scale=200:106,format=rgba[watermark]; ` +
    `[watermark]colorchannelmixer=aa=0.8[watermarkTransparent]; ` +
    `[withText][watermarkTransparent]overlay=80:80[final]; ` +
    `[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[voiceover]; ` +
    `[3:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${backgroundVolume}[background]; ` +
    `[voiceover][background]amix=inputs=2:duration=longest[audio]`;

  // Execute the ffmpeg command with all filters
  const command = `ffmpeg -y -loop 1 -i "${imagePath}" -stream_loop -1 -i "${watermarkPath}" -i "${audioPath}" -i "${backgroundAudioPath}" -filter_complex "${filters}" -map "[final]" -map "[audio]" -pix_fmt yuv420p -c:v libx264 -r 50 -t ${duration} "${videoClipPath}"`;

  execSync(command);

  return videoClipPath;
};

// This function is now only responsible for concatenating the clips
const concatenateClipsWithAudio = (videoClips) => {
  const fileListPath = path.join(outputDirectory, "file_list.txt");
  const fileListContent = videoClips.map((file) => `file '${file}'`).join("\n");
  fs.writeFileSync(fileListPath, fileListContent);

  const command = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c:v libx264 -preset medium -crf 22 -c:a aac -b:a 192k "${videoOutputPath}"`;
  execSync(command);

  fs.unlinkSync(fileListPath);
};

// New function to add background music to the final video
const addBackgroundMusic = (finalVideoPath, backgroundAudioPath) => {
  // Adjust the volume of the background music, 0.1 is 10% of the original volume
  const backgroundVolume = "0.2";
  const outputVideoPath = path.join(
    outputDirectory,
    "final_video_with_music.mp4"
  );

  const command = `ffmpeg -y -i "${finalVideoPath}" -i "${backgroundAudioPath}" -filter_complex "[1:a]volume=${backgroundVolume}[background];[0:a][background]amix=inputs=2:duration=first[audio]" -map 0:v -map "[audio]" -c:v copy -c:a aac -shortest "${outputVideoPath}"`;

  execSync(command);

  return outputVideoPath;
};

// Main function to generate the final video
const generateVideo = async () => {
  const videoClips = [];
  const backgroundAudioPath = path.join(
    __dirname,
    "..",
    "data",
    "input",
    "audio",
    "background-audio.mp3"
  );

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
      duration,
      sceneNumber,
      backgroundAudioPath
    );
    videoClips.push(videoClipPath);
  }

  concatenateClipsWithAudio(videoClips);
  // After concatenating video clips, add background music
  const finalVideoPathWithMusic = addBackgroundMusic(
    videoOutputPath,
    backgroundAudioPath
  );
  console.log(
    `Generated video with music is available at: ${finalVideoPathWithMusic}`
  );
};

const clearOutputDirectory = () => {
  const files = fs.readdirSync(outputDirectory);
  for (const file of files) {
    if (file.endsWith(".mp4") || file === "file_list.txt") {
      fs.unlinkSync(path.join(outputDirectory, file));
    }
  }
};

// Execute the video generation process
(async () => {
  try {
    clearOutputDirectory();
    await generateVideo();
  } catch (error) {
    console.error("Error generating video:", error);
  }
})();
