require("dotenv").config();
const { google } = require("googleapis");
const express = require("express");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 8080;

// Load client secrets and video details
const credentials = require("../../youtube-web.json");
const videoDetails = require("../../src/data/input/videos-and-scenes-data.json");
const { client_secret, client_id, redirect_uris } = credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// Check if there is a valid access token
// Parse the expiry time as an integer and compare
const tokenExpiry = parseInt(process.env.TOKEN_EXPIRY, 10);
if (process.env.ACCESS_TOKEN && new Date(tokenExpiry) > new Date()) {
  oauth2Client.setCredentials({
    access_token: process.env.ACCESS_TOKEN,
    refresh_token: process.env.REFRESH_TOKEN,
    expiry_date: tokenExpiry,
  });

  uploadVideo();
} else {
  console.log(
    "Authorize this app by visiting this url:",
    oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/youtube"],
    })
  );

  // Open the authorization URL in the user's browser
  (async () => {
    const open = (await import("open")).default;
    open(
      oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/youtube"],
      })
    );
  })();
}

async function uploadVideo() {
  try {
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const videoFilePath = path.join(
      __dirname,
      "../data/output/final_video_with_music.mp4"
    );
    const videoResponse = await youtube.videos.insert({
      part: "id,snippet,status",
      requestBody: {
        snippet: {
          title: videoDetails.Title,
          description: videoDetails.Description,
          tags: ["shorts"],
          categoryId: "22",
        },
        status: {
          privacyStatus: "public",
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    });

    const videoId = videoResponse.data.id;
    const youtubeVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`Video uploaded, video URL: ${youtubeVideoUrl}`);
    process.exit(0);
  } catch (error) {
    console.error("Error uploading video: ", error);
  }
}

const updateEnvFile = (newValues) => {
  let envContent = fs.readFileSync(".env", "utf8");
  Object.entries(newValues).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*`, "gm");
    if (envContent.match(regex)) {
      // Replace existing line
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Add new line
      envContent += `\n${key}=${value}`;
    }
  });
  fs.writeFileSync(".env", envContent);
};

app.get("/", async (req, res) => {
  try {
    const { code } = req.query;
    if (code) {
      // Use the code to obtain tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      // Update the .env file with the new tokens
      updateEnvFile({
        ACCESS_TOKEN: tokens.access_token,
        REFRESH_TOKEN: tokens.refresh_token,
        TOKEN_EXPIRY: tokens.expiry_date,
      });
    }

    // Upload the video
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const videoFilePath = path.join(
      __dirname,
      "../data/output/final_video_with_music.mp4"
    );
    const videoResponse = await youtube.videos.insert({
      part: "id,snippet,status",
      requestBody: {
        snippet: {
          title: videoDetails.Title,
          description: videoDetails.Description,
          tags: ["shorts"],
          categoryId: "22",
        },
        status: {
          privacyStatus: "public",
          madeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(videoFilePath),
      },
    });

    console.log(
      "Video uploaded privatly to YouTube: ",
      `https://www.youtube.com/watch?v=${videoResponse.data.id}`
    );
    res.send(
      `Video uploaded, video ID: <a>https://www.youtube.com/watch?v=${videoResponse.data.id}</a>`
    );
    process.exit(0);
  } catch (error) {
    console.error("Error: ", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
