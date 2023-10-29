#!/bin/bash

generate_voiceover() {
    local scene=$1
    local description=$2
    local voiceover_path=$3

    local voiceover_response=$(curl --request POST \
                                        --url https://play.ht/api/v2/tts \
                                        --header "AUTHORIZATION: Bearer $SECRET_KEY" \
                                        --header "X-USER-ID: $USER_ID" \
                                        --header 'accept: text/event-stream' \
                                        --header 'content-type: application/json' \
                                        --data "{ \"text\": \"$description\", \"voice\": \"s3://peregrine-voices/oliver_narrative2_parrot_saad/manifest.json\", \"voice_engine\": \"PlayHT2.0\" }")

    local voiceover_url=$(echo "$voiceover_response" | grep -o "https://peregrine-results.s3.amazonaws.com[^\" ]*\.mp3")
    local temp_voiceover_mp3="$VOICEOVER_DIR/$scene-temp-voiceover.mp3"
    
    curl -o $temp_voiceover_mp3 $voiceover_url
    ffmpeg -y -i $temp_voiceover_mp3 -c:a aac $voiceover_path
    rm $temp_voiceover_mp3
}

generate_scene_video() {
    local scene=$1
    local description=$2
    local filename=$3
    local duration=$4
    local output_path=$5

    if [ ${#description} -gt 30 ]; then
        local midpoint=$(( ${#description} / 2 ))
        local split_point=$(echo $description | awk -v mp=$midpoint 'BEGIN{FS=""}{for(i=mp;i<=NF;i++) if($i==" ") {print i; exit}}')
        description="${description:0:$split_point}\n${description:$split_point}"
    fi

    ffmpeg -y -loop 1 \
           -i "$IMG_DIR/$filename" \
           -vf "fps=25,scale=1920:-1,drawtext=text='$description':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=60:fontcolor=white:fontfile=$FONT_PATH,drawtext=text='CODE WORTHY':x=50:y=50:fontsize=80:fontcolor=green:fontfile=$FONT_PATH" \
           -pix_fmt yuv420p \
           -c:v libx264 \
           -t $duration \
           $output_path
}

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
SCENE_VIDEOS_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/scene_videos_list.txt"
TEMP_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/scenes_videos"

# API credentials
USER_ID="kW0pPfKLtlhGJwEnPmqAeqIpyOt1"
SECRET_KEY="966fffff684a4d2182f7e1567aa3133b"

# Empty files
echo "" > $IMG_LIST
echo "" > $VOICEOVER_LIST
echo "" > $SCENE_VIDEOS_LIST

mkdir -p $TEMP_DIR

# Process each scene
for scene in $(seq 1 10); do
    duration=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Duration" $DATA_FILE)
    description=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Description" $DATA_FILE)
    filename="$scene-$(echo $description | tr ' ' '_' | tr -d ',.').png"
    voiceover="$VOICEOVER_DIR/$scene-scene-voiceover.aac"

    # Image list for video creation
    echo "file '$IMG_DIR/$filename'" >> $IMG_LIST
    echo "duration $duration" >> $IMG_LIST

    # Generate voiceovers
    generate_voiceover $scene "$description" $voiceover

    # Add voiceover to list
    echo "file '$voiceover'" >> $VOICEOVER_LIST
    echo "duration $duration" >> $VOICEOVER_LIST

    # Generate individual scene video
    scene_video="$TEMP_DIR/scene_$scene.mp4"
    generate_scene_video $scene "$description" "$filename" $duration $scene_video

    # Scene videos list for final video creation
    echo "file '$scene_video'" >> $SCENE_VIDEOS_LIST
done

# Audio and video processing
ffmpeg -y -f concat -safe 0 -i $VOICEOVER_LIST -af "aresample=async=1" -c:a aac -strict -2 $TEMP_CONCAT_AUDIO
ffmpeg -y -i $AUDIO_PATH -i $TEMP_CONCAT_AUDIO -filter_complex "[0]volume=0.3[a];[a][1]amix=inputs=2:duration=first:dropout_transition=2" -c:a aac -strict experimental mixed_audio.aac
ffmpeg -y -f concat -safe 0 -i $SCENE_VIDEOS_LIST -c copy -y concatenated_scenes.mp4
ffmpeg -y -i concatenated_scenes.mp4 -i mixed_audio.aac -c:v copy -c:a aac -strict experimental -map 0:v:0 -map 1:a:0 -shortest $OUTPUT_VIDEO

# Cleanup
rm -r $TEMP_DIR
rm concatenated_scenes.mp4 mixed_audio.aac
rm $TEMP_CONCAT_AUDIO

echo "Video creation completed!"
