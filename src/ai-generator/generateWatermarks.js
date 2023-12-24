const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

async function addWatermark(videoPath, watermarkPath, outputPath, watermarkDurationSec, watermarkWidth, marginTop) {
    try {
        // Get dimensions of the watermark
        const { width, height } = await getVideoDimensions(watermarkPath);
        const aspectRatio = height / width;
        const newHeight = watermarkWidth * aspectRatio;

        // Get the duration of the input video
        const videoDuration = await getVideoDuration(videoPath);
        const watermarkStart = Math.max(0, videoDuration - watermarkDurationSec);

        // Construct the FFmpeg command
        const command = `ffmpeg -y -i "${videoPath}" -itsoffset ${watermarkStart} -i "${watermarkPath}" -filter_complex "[1:v]scale=${watermarkWidth}:${newHeight}[wm];[0:v][wm]overlay=(main_w-overlay_w)/2:${marginTop}:enable='between(t,${watermarkStart},${videoDuration})'" -c:v libx264 -c:a copy "${outputPath}"`;

        // Execute the command
        await executeCommand(command);

        console.log('Watermark added successfully');
    } catch (error) {
        console.error('Error:', error);
    }
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                console.error('FFmpeg stderr:', stderr);
            }
            resolve(stdout);
        });
    });
}

async function getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(stderr);
                return;
            }
            resolve(parseFloat(stdout.trim()));
        });
    });
}

async function getVideoDimensions(videoPath) {
    return new Promise((resolve, reject) => {
        exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
                return;
            }
            if (stderr) {
                reject(stderr);
                return;
            }
            const dimensions = stdout.trim().split('x');
            resolve({ width: parseInt(dimensions[0], 10), height: parseInt(dimensions[1], 10) });
        });
    });
}

// Usage
const videoRelativePath = '../data/output/final_output.mp4';
const watermarkRelativePath = '../data/output/watermarks/subscribe-watermark.mp4';
const outputRelativePath = '../data/output/output.mp4';
const watermarkDurationSec = 5; // Duration in seconds for which the watermark will be shown
const watermarkWidth = 600; // Desired width of the watermark
const marginTop = 200; // Margin from the top in pixels

// Convert relative paths to absolute paths
const videoPath = path.resolve(__dirname, videoRelativePath);
const watermarkPath = path.resolve(__dirname, watermarkRelativePath);
const outputPath = path.resolve(__dirname, outputRelativePath);

// Check if the video file exists
fs.stat(videoPath, async (err) => {
    if (err) {
        console.error('Error accessing video file:', err);
        return;
    }

    await addWatermark(videoPath, watermarkPath, outputPath, watermarkDurationSec, watermarkWidth, marginTop);
});