#!/bin/bash

# Directory and file paths
DATA_FILE="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/videos-and-scenes-data.json"
IMG_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes"
IMG_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/img_list.txt"
OUTPUT_VIDEO="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/videos/output_video.mp4"
AUDIO_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/audio/background-audio.mp3"
VOICEOVER_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/voiceovers"
VOICEOVER_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/voiceover_list.txt"
FONT_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/fonts/RobotoBoldCondensed.ttf"
TEMP_CONCAT_AUDIO="temp_concat_audio.aac"
SILENT_AUDIO="silent_audio.aac"
SCENE_VIDEOS_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/scene_videos_list.txt"

# Empty the img_list.txt and voiceover_list.txt files
echo "" > $IMG_LIST
echo "" > $VOICEOVER_LIST
echo "" > $SCENE_VIDEOS_LIST

# Generate a short silent audio segment for padding purposes
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 9 -acodec aac $SILENT_AUDIO

# Loop through the scenes to extract details from the JSON file and write to img_list.txt and voiceover_list.txt
for scene in $(seq 1 10); do
  DURATION=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Duration" $DATA_FILE)
  VOICEOVER_DURATION=$(echo "$DURATION * 0.5" | bc)
  PAD_DURATION=$(echo "$DURATION - $VOICEOVER_DURATION" | bc)
  DESCRIPTION=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Description" $DATA_FILE)
  FILENAME="$scene-$(echo $DESCRIPTION | tr ' ' '_' | tr -d ',.').png"
  VOICEOVER="$VOICEOVER_DIR/$scene-scene-voiceover.aac"

  echo "file '$IMG_DIR/$FILENAME'" >> $IMG_LIST
  echo "duration $DURATION" >> $IMG_LIST

  # Check if voiceover exists for the scene
  if [ -f $VOICEOVER ]; then
    echo "file '$VOICEOVER'" >> $VOICEOVER_LIST
    echo "duration $VOICEOVER_DURATION" >> $VOICEOVER_LIST
  else
    # If no voiceover, use silent audio for that half duration
    echo "file '$SILENT_AUDIO'" >> $VOICEOVER_LIST
    echo "duration $VOICEOVER_DURATION" >> $VOICEOVER_LIST
  fi
  
  # Pad with silent audio for the remaining half duration
  echo "file '$SILENT_AUDIO'" >> $VOICEOVER_LIST
  echo "duration $PAD_DURATION" >> $VOICEOVER_LIST

  echo "Writing to img_list.txt: file '$IMG_DIR/$FILENAME' for duration $DURATION"
done

# Combine voiceovers with aresample to handle potential timestamp issues
ffmpeg -f concat -safe 0 -i $VOICEOVER_LIST -af "aresample=async=1" -c:a aac -strict -2 $TEMP_CONCAT_AUDIO

if [ ! -f $TEMP_CONCAT_AUDIO ]; then
    echo "Error creating concatenated voiceover. Exiting."
    exit 1
fi

# 1. Combine Voiceover and Background Audio
ffmpeg \
  -i $AUDIO_PATH \
  -i $TEMP_CONCAT_AUDIO \
  -filter_complex "amix=inputs=2:duration=first:dropout_transition=2" \
  -c:a aac \
  -strict experimental \
  mixed_audio.aac

TEMP_DIR="/tmp/scenes_videos" # Temporary directory to store individual scene videos
mkdir -p $TEMP_DIR

# 2. Generate individual videos for each scene with watermark of scene's description
for scene in $(seq 1 10); do
  DESCRIPTION=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Description" $DATA_FILE)
  FILENAME="$scene-$(echo $DESCRIPTION | tr ' ' '_' | tr -d ',.').png"
  SCENE_VIDEO="$TEMP_DIR/scene_$scene.mp4"

  # Wrap the description more aggressively if it's too long
  if [ ${#DESCRIPTION} -gt 30 ]; then
    MIDPOINT=$(( ${#DESCRIPTION} / 2 ))
    SPLIT_POINT=$(echo $DESCRIPTION | awk -v mp=$MIDPOINT 'BEGIN{FS=""}{for(i=mp;i<=NF;i++) if($i==" ") {print i; exit}}')
    DESCRIPTION="${DESCRIPTION:0:$SPLIT_POINT}\n${DESCRIPTION:$SPLIT_POINT}"
  fi

  ffmpeg \
  -loop 1 \
  -i "$IMG_DIR/$FILENAME" \
  -vf "fps=25,scale=1920:-1,drawtext=text='$DESCRIPTION':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=48:fontcolor=white:fontfile=$FONT_PATH,drawtext=text='CODE WORTHY':x=50:y=50:fontsize=80:fontcolor=green:fontfile=$FONT_PATH" \
  -pix_fmt yuv420p \
  -c:v libx264 \
  -t $(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Duration" $DATA_FILE) \
  $SCENE_VIDEO
done

# Generate a list of individual scene videos
find $TEMP_DIR -name "scene_*.mp4" | sort -n | while read line; do echo "file '$line'" >> $SCENE_VIDEOS_LIST; done

# 3. Concatenate the individual scene videos
ffmpeg \
  -f concat -safe 0 -i $SCENE_VIDEOS_LIST \
  -c copy \
  -y \
  concatenated_scenes.mp4

# 4. Combine concatenated video with mixed audio
ffmpeg \
  -i concatenated_scenes.mp4 \
  -i mixed_audio.aac \
  -c:v copy \
  -c:a aac \
  -strict experimental \
  -map 0:v:0 \
  -map 1:a:0 \
  -shortest \
  $OUTPUT_VIDEO

# Cleanup temporary files
rm -r $TEMP_DIR
rm concatenated_scenes.mp4 mixed_audio.aac
rm $TEMP_CONCAT_AUDIO
rm $SILENT_AUDIO

echo "Video creation completed!"
