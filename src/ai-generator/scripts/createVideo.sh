#!/bin/bash

# Directory and file paths
BASE_DIR="./src"
DATA_FILE="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/videos-and-scenes-data.json"
IMG_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes"
IMG_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/img_list.txt"
OUTPUT_VIDEO="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/videos/output_video.mp4"
AUDIO_PATH="src/data/input/audio/background-audio.mp3"

# Empty the img_list.txt file
echo "" > $IMG_LIST

# Loop through the scenes to extract details from the JSON file and write to img_list.txt
for scene in $(seq 1 10); do
  # Extract the duration and description from the JSON file using jq
  DURATION=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Duration" $DATA_FILE)
  DESCRIPTION=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Description" $DATA_FILE)

  # Convert description into a filename-friendly format
  FILENAME="$scene-$(echo $DESCRIPTION | tr ' ' '_' | tr -d ',.').png"

  # Write to the img_list.txt
  echo "file '$IMG_DIR/$FILENAME'" >> $IMG_LIST
  echo "duration $DURATION" >> $IMG_LIST
  echo "Writing to img_list.txt: file '$IMG_DIR/$FILENAME' for duration $DURATION"
done

# Use FFmpeg to create the video with background audio
ffmpeg -f concat -safe 0 -i $IMG_LIST -i $AUDIO_PATH -c:v libx264 -c:a aac -strict experimental -vf "fps=25,scale=1920:-1" -pix_fmt yuv420p $OUTPUT_VIDEO

echo "Video created at: $OUTPUT_VIDEO"
