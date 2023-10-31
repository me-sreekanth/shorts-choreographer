#!/bin/bash

generate_voiceover() {
    local scene=$1
    local description=$2
    local voiceover_path=$3

    # Replace % with 'percentage' in the description for voiceover
    description=$(echo "$description" | sed 's/%/percentage/g')

    if [ ! -f "$voiceover_path" ]; then
        local voiceover_response=$(curl --request POST \
                                            --url https://play.ht/api/v2/tts \
                                            --header "AUTHORIZATION: Bearer $SECRET_KEY" \
                                            --header "X-USER-ID: $USER_ID" \
                                            --header 'accept: text/event-stream' \
                                            --header 'content-type: application/json' \
                                            --data "{ \"text\": \"$description\", \"voice\": \"s3://peregrine-voices/mel28/manifest.json\", \"voice_engine\": \"PlayHT2.0\" }")

echo "Voiceover API Response: $voiceover_response"
        local voiceover_url=$(echo "$voiceover_response" | grep -o "https://peregrine-results.s3.amazonaws.com[^\" ]*\.mp3")
        if [ -z "$voiceover_url" ]; then
    echo "Error: Voiceover URL not found!"
    exit 1
fi
        local temp_voiceover_mp3="$VOICEOVER_DIR/$scene-temp-voiceover.mp3"
        
        curl -o $temp_voiceover_mp3 $voiceover_url
        ffmpeg -y -i $temp_voiceover_mp3 -c:a aac $voiceover_path
        rm $temp_voiceover_mp3
    fi
}


generate_scene_video() {
    local scene=$1
    local description=$2
    local filename=$3
    local duration=$4
    local output_path=$5

    local text=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Text" $DATA_FILE)
    local words=($text)  # Split text into words
    local num_words=${#words[@]}  # Count words

    # Check if number of words is zero and handle it
    if [ $num_words -eq 0 ]; then
        echo "Error: No words found for scene $scene. Skipping video generation."
        return 1
    fi

    local word_duration=$(awk "BEGIN {print $duration/$num_words}")  # Duration for each word
    local filters=""

    # Debug prints
    echo "For scene $scene:"
    echo "Duration: $duration"
    echo "Number of words: $num_words"
    echo "Word duration: $word_duration"
    
   # Build drawtext filters for each word
    for i in "${!words[@]}"; do
        local start_time=$(awk "BEGIN {print $word_duration*$i}")
        local word="${words[$i]}"
        
        # Escape single quotes inside the word
        local escaped_word=$(echo "$word" | sed "s/'/'\\\\''/g")
        
        filters+="[zoomed]drawtext=text='$escaped_word':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=60:fontcolor=white:fontfile=$FONT_PATH_ITALIC:borderw=3:bordercolor=black:box=1:boxcolor=black@0.2:enable='between(t,$start_time,$start_time+$word_duration)'[zoomed];"
    done

    # Debug print
    echo "Constructed filter: $filters"

    ffmpeg -y -loop 1 \
       -i "$IMG_DIR/$filename" \
       -i "$WATERMARK_PATH" \
       -filter_complex "[0:v]fps=25,zoompan=z='min(zoom+0.0008,1.3)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=$duration*25,scale=-1:1920,crop=1080:1920:((in_w-1080)/2):0[zoomed];$filters[1:v]format=yuva444p,colorchannelmixer=aa=0.7[watermark];[zoomed][watermark]overlay=10:10" \
       -pix_fmt yuv420p \
       -c:v libx264 \
       -t $duration \
       $output_path #2>> ffmpeg_errors.log   # Redirect errors and warnings from ffmpeg to the log file
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
WATERMARK_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/watermarks/code_worthy_channel_logo.png"

# API credentials
USER_ID="kW0pPfKLtlhGJwEnPmqAeqIpyOt1"
SECRET_KEY="966fffff684a4d2182f7e1567aa3133b"

# Determine the number of scenes
total_scenes=$(jq '.Scenes | length' $DATA_FILE)

# Empty files
echo "" > $IMG_LIST
echo "" > $VOICEOVER_LIST
echo "" > $SCENE_VIDEOS_LIST

mkdir -p $TEMP_DIR

# Process each scene
for scene in $(seq 1 $total_scenes); do
       duration=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Duration" $DATA_FILE)
    voiceover_text=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .VoiceOverText" $DATA_FILE)
    description=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Description" $DATA_FILE)
    text=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .Text" $DATA_FILE | sed 's/%/%%/g')
    filename="$scene-scene.png"
    voiceover="$VOICEOVER_DIR/$scene-scene-voiceover.aac"

    # Image list for video creation
    echo "file '$IMG_DIR/$filename'" >> $IMG_LIST
    echo "duration $duration" >> $IMG_LIST

    # Check if voiceover file already exists
    if [ ! -f "$voiceover" ]; then
        # Generate voiceovers
        generate_voiceover $scene "$voiceover_text" $voiceover
    fi

    # Add voiceover to list
    echo "file '$voiceover'" >> $VOICEOVER_LIST
    echo "duration $duration" >> $VOICEOVER_LIST

    # Generate individual scene video
    scene_video="$TEMP_DIR/scene_$scene.mp4"
    generate_scene_video $scene "$text" "$filename" $duration $scene_video

    # Scene videos list for final video creation
    echo "file '$scene_video'" >> $SCENE_VIDEOS_LIST
done

# Audio and video processing
ffmpeg -y -f concat -safe 0 -i $VOICEOVER_LIST -af "aresample=async=1" -c:a aac -strict -2 $TEMP_CONCAT_AUDIO
ffmpeg -y -i $AUDIO_PATH -i $TEMP_CONCAT_AUDIO -filter_complex "[0]volume=0.1[a];[a][1]amix=inputs=2:duration=first:dropout_transition=2" -c:a aac -strict experimental mixed_audio.aac
ffmpeg -y -f concat -safe 0 -i $SCENE_VIDEOS_LIST -c copy -y concatenated_scenes.mp4
ffmpeg -y -i concatenated_scenes.mp4 -i mixed_audio.aac -c:v copy -c:a aac -strict experimental -map 0:v:0 -map 1:a:0 -shortest $OUTPUT_VIDEO

# Cleanup
rm -r $TEMP_DIR
rm concatenated_scenes.mp4 mixed_audio.aac
rm $TEMP_CONCAT_AUDIO

echo "Video creation completed!"
