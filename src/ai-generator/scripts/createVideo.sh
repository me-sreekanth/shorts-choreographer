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
                                            --data "{ \"text\": \"$description\", \"voice\": \"s3://peregrine-voices/hudson saad parrot/manifest.json\", \"voice_engine\": \"PlayHT2.0\" }")

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

# Check if the voiceover was created successfully
# if [ -f "$voiceover_path" ]; then
#     # Append the file path to the voiceover list
#     # echo "file '$voiceover_path'" >> $VOICEOVER_LIST
# else
#     echo "Error: Failed to create voiceover at path $voiceover_path"
#     exit 1
# fi

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

    local pause_duration=1  # Pause duration at the start and end
    local adjusted_duration=$((duration - 2 * pause_duration))  # Adjusted duration for the voiceover without pauses
    local word_duration=$(awk "BEGIN {print $adjusted_duration/$num_words}")  # Duration for each word

    # Debug prints
    echo "For scene $scene:"
    echo "Duration: $duration"
    echo "Number of words: $num_words"
    echo "Word duration: $word_duration"
    echo "Pause duration: $pause_duration"

    local filters=""

    # Build drawtext filters for each word
    for ((i=0; i<$num_words; i++)); do
        local start_time=$(awk "BEGIN {print $word_duration*$i + $pause_duration}")
        local word="${words[$i]}"

        # Convert the word to uppercase using 'tr'
        word=$(echo "$word" | tr '[:lower:]' '[:upper:]')

        # Escape single quotes inside the word
        local escaped_word=$(echo "$word" | sed "s/'/'\\\\''/g")

        filters+="drawtext=text='$escaped_word':x=(w-text_w)/2:y=(h-text_h)/2:fontsize=90:fontcolor=yellow:fontfile=$FONT_PATH:borderw=3:bordercolor=black:box=1:boxcolor=black@0.2:enable='between(t,$start_time,$start_time+$word_duration)',"
    done

    # Remove the trailing comma from filters
    filters=${filters%,}

    ffmpeg -y -loop 1 \
       -i "$IMG_DIR/$filename" \
       -i "$WATERMARK_PATH" \
       -filter_complex \
       "[0:v]fps=50,zoompan=z='min(zoom+0.001,1.5)':d=$duration*50:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=768x1024[zoomed]; \
        [zoomed]scale=1440:1920[scaled]; \
        [scaled]crop=1080:1920:((1440-1080)/2):0[cropped]; \
        [cropped]$filters[withText]; \
        [1:v]scale=300:-1,format=rgba[watermark]; \
        [watermark]colorchannelmixer=aa=0.9[watermarkTransparent]; \
        [withText][watermarkTransparent]overlay=50:50" \
       -pix_fmt yuv420p \
       -c:v libx264 \
       -r 50 \
       -t $duration \
       $output_path
}

add_pauses_to_audio() {
    local voiceover=$1
    local pause_duration=$2
    local duration=$3
    local voiceover_with_pauses=$4

    # This adds a pause of 1 second at the beginning and end of the audio file
    ffmpeg -y -i $voiceover -af "apad=pad_dur=$pause_duration:whole_dur=$(($duration + $pause_duration))" $voiceover_with_pauses
}

# Error checking function
check_command_success() {
    if [ $? -ne 0 ]; then
        echo "Error: Command failed - $1"
        exit 1
    fi
}

# Function to get the duration of an audio file in seconds and round it
get_audio_duration() {
    local audio_file=$1
    local duration
    duration=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$audio_file")
    echo "$duration" | awk '{printf("%d\n",$1 + 0.5)}' # rounds to the nearest integer
}

# Directory and file paths
DATA_FILE="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/videos-and-scenes-data.json"
IMG_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes"
IMG_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/img_list.txt"
OUTPUT_VIDEO="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/videos/output_video.mp4"
AUDIO_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/audio/background-audio.mp3"
VOICEOVER_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/voiceovers"
VOICEOVER_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/voiceover_list.txt"
FONT_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/fonts/Bangers-Regular.ttf"
TEMP_CONCAT_AUDIO="temp_concat_audio.aac"
SCENE_VIDEOS_LIST="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/scene_videos_list.txt"
TEMP_DIR="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/scenes/scenes_videos"
WATERMARK_PATH="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/output/watermarks/code_worthy_channel_logo.png"

# API credentials
USER_ID="dIzV24C18qRrkG7tqbM0ESSD1bv1"
SECRET_KEY="543b3187c54248c18b16f429f76b5278"

# Determine the number of scenes
total_scenes=$(jq '.Scenes | length' $DATA_FILE)

# Empty files
echo "" > $IMG_LIST
echo "" > $VOICEOVER_LIST
echo "" > $SCENE_VIDEOS_LIST

mkdir -p $TEMP_DIR

for scene in $(seq 1 $total_scenes); do
    voiceover_text=$(jq -r ".Scenes[] | select(.SceneNumber == $scene) | .VoiceOverText" $DATA_FILE)
    filename="$scene-scene.png"
    voiceover="$VOICEOVER_DIR/$scene-scene-voiceover.aac"
    voiceover_with_pauses="$VOICEOVER_DIR/$scene-scene-voiceover-with-pauses.aac"

    # Generate voiceover if it doesn't exist
    if [ ! -f "$voiceover" ]; then
        generate_voiceover $scene "$voiceover_text" $voiceover
    fi

    # Add pauses to the voiceover
    add_pauses_to_audio $voiceover 1 # Pass only the voiceover and pause duration
    # The duration of the scene will be determined by the voiceover with pauses
    duration=$(get_audio_duration "$voiceover_with_pauses")
duration_rounded=$(echo "$duration" | awk '{printf("%d\n",$1 + 0.5)}') # rounds to the nearest integer


    if [ ! -f "$voiceover_with_pauses" ]; then
        echo "Error: Failed to create voiceover with pauses at path $voiceover_with_pauses"
        exit 1
    fi

    # Append the file path of the voiceover with pauses to the voiceover list
    echo "file '$voiceover_with_pauses'" >> $VOICEOVER_LIST

    # Generate individual scene video using the voiceover with pauses
    scene_video="$TEMP_DIR/scene_$scene.mp4"
    generate_scene_video $scene "$text" "$filename" $duration_rounded $scene_video
    check_command_success "generate_scene_video for scene $scene"

    # Scene videos list for final video creation
    echo "file '$scene_video'" >> $SCENE_VIDEOS_LIST
done

# Check contents of the VOICEOVER_LIST before processing
echo "Contents of VOICEOVER_LIST:"
cat $VOICEOVER_LIST
echo "End of VOICEOVER_LIST"

# Check contents of the SCENE_VIDEOS_LIST before processing
echo "Contents of SCENE_VIDEOS_LIST:"
cat $SCENE_VIDEOS_LIST
echo "End of SCENE_VIDEOS_LIST"

# Audio and video processing
ffmpeg -y -f concat -safe 0 -i $VOICEOVER_LIST -af "aresample=async=1" -c:a aac -strict -2 $TEMP_CONCAT_AUDIO
check_command_success "concatenating voiceovers"

ffmpeg -y -i $AUDIO_PATH -i $TEMP_CONCAT_AUDIO -filter_complex "[0]volume=0.1[a];[a][1]amix=inputs=2:duration=first:dropout_transition=2" -c:a aac -strict experimental mixed_audio.aac
check_command_success "mixing background audio with voiceovers"

ffmpeg -y -f concat -safe 0 -i $SCENE_VIDEOS_LIST -c copy -y concatenated_scenes.mp4
check_command_success "concatenating scene videos"

ffmpeg -y -i concatenated_scenes.mp4 -i mixed_audio.aac -c:v copy -c:a aac -strict experimental -map 0:v:0 -map 1:a:0 -shortest $OUTPUT_VIDEO
check_command_success "merging audio and video"

# Cleanup
[ -d "$TEMP_DIR" ] && rm -r "$TEMP_DIR"
[ -f concatenated_scenes.mp4 ] && rm concatenated_scenes.mp4
[ -f mixed_audio.aac ] && rm mixed_audio.aac
[ -f $TEMP_CONCAT_AUDIO ] && rm $TEMP_CONCAT_AUDIO

echo "Video creation completed!"
