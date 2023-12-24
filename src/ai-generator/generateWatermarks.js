const ffmpeg = require('fluent-ffmpeg');

// Function to add video watermark with reduced width and maintained aspect ratio
function addVideoWatermark(inputVideoPath, watermarkVideoPath, outputVideoPath, marginTop) {
    // Get the dimensions of the watermark
    ffmpeg.ffprobe(watermarkVideoPath, (err, metadata) => {
        if (err) {
            console.error('Error reading video metadata:', err);
            return;
        }

        const originalWidth = metadata.streams[0].width;
        const originalHeight = metadata.streams[0].height;

        // Reduce width by 100 pixels from the already halved width
        const reducedWidth = (originalWidth / 2) - 100;
        // Calculate new height to maintain aspect ratio
        const aspectRatio = originalWidth / originalHeight;
        const newHeight = reducedWidth / aspectRatio;

        // Apply the watermark with new dimensions
        ffmpeg(inputVideoPath)
            .input(watermarkVideoPath)
            .complexFilter([
                // Scale watermark to new dimensions
                `[1:v]scale=${reducedWidth}:${newHeight}[wmScaled]`,
                // Place watermark at top center with specified margin
                `[0:v][wmScaled]overlay=x=(main_w-overlay_w)/2:y=${marginTop}[out]`
            ], 'out')
            .save(outputVideoPath)
            .on('end', () => {
                console.log('Video watermark added successfully');
            })
            .on('error', (err) => {
                console.error('Error:', err);
            });
    });
}

// Usage
addVideoWatermark(
    'E:\\Sreekanth\\shorts-choreographer\\src\\data\\output\\final_output.mp4',
    'E:\\Sreekanth\\shorts-choreographer\\src\\data\\output\\watermarks\\subscribe-watermark.mp4',
    'E:\\Sreekanth\\shorts-choreographer\\src\\data\\output\\output.mp4',
    200  // marginTop in pixels
);


// const { exec } = require('child_process');
// const path = require('path');
// const fs = require('fs');

// async function addWatermark(videoPath, watermarkPath, outputPath, watermarkWidth, topMargin) {
//     try {
//         // Get dimensions of the watermark
//         const { width, height } = await getVideoDimensions(watermarkPath);
//         const newHeight = Math.round((watermarkWidth / width) * height);

//         // Get the duration of the video
//         const duration = await getVideoDuration(videoPath);
//         const watermarkStart = Math.max(0, duration - 5);

//         // Construct the FFmpeg command with margin
//        // Construct the FFmpeg command without 'shortest' flag
// const command = `ffmpeg -y -i "${videoPath}" -i "${watermarkPath}" -filter_complex "[1:v]scale=${watermarkWidth}:${newHeight}[resizedWatermark];[0:v][resizedWatermark]overlay=x=(W-w)/2:y=${topMargin}:enable='gte(t,${watermarkStart})',format=yuv420p" -c:v libx264 -c:a copy "${outputPath}"`;

//         await executeCommand(command);

//         console.log('Watermark added successfully');
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

// function executeCommand(command) {
//     return new Promise((resolve, reject) => {
//         exec(command, (error, stdout, stderr) => {
//             if (error) {
//                 reject(error);
//                 return;
//             }
//             if (stderr) {
//                 console.error('FFmpeg stderr:', stderr);
//             }
//             resolve(stdout);
//         });
//     });
// }

// async function getVideoDuration(videoPath) {
//     return new Promise((resolve, reject) => {
//         exec(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`, (error, stdout, stderr) => {
//             if (error) {
//                 reject(error);
//                 return;
//             }
//             if (stderr) {
//                 reject(stderr);
//                 return;
//             }
//             resolve(parseFloat(stdout.trim()));
//         });
//     });
// }

// async function getVideoDimensions(videoPath) {
//     return new Promise((resolve, reject) => {
//         exec(`ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${videoPath}"`, (error, stdout, stderr) => {
//             if (error) {
//                 reject(error);
//                 return;
//             }
//             if (stderr) {
//                 reject(stderr);
//                 return;
//             }
//             const dimensions = stdout.trim().split('x');
//             resolve({ width: parseInt(dimensions[0], 10), height: parseInt(dimensions[1], 10) });
//         });
//     });
// }

// // Usage
// const videoRelativePath = '../data/output/final_output.mp4'; // Replace with relative path to your input video
// const watermarkRelativePath = '../data/output/watermarks/subscribe.mp4'; // Replace with relative path to your watermark
// const outputRelativePath = '../data/output/output.mp4'; // Replace with relative path to your output video

// // Convert relative paths to absolute paths
// const videoPath = path.resolve(__dirname, videoRelativePath);
// const watermarkPath = path.resolve(__dirname, watermarkRelativePath);
// const outputPath = path.resolve(__dirname, outputRelativePath);
// const watermarkWidth = 500; // Desired width of the watermark, keeping aspect ratio

// // Check if the video file exists
// fs.stat(videoPath, async (err) => {
//     if (err) {
//         console.error('Error accessing video file:', err);
//         return;
//     }
//     // Desired top margin in pixels
// const topMargin = 50; 

// // Usage section
// await addWatermark(videoPath, watermarkPath, outputPath, watermarkWidth, topMargin);
// });