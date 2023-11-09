#!/bin/bash

# Paths to the directories containing the files to be cleaned up
scenes_dir="./src/data/output/scenes"
voiceovers_dir="./src/data/output/voiceovers"
videos_dir="./src/data/output"

# Function to delete files based on directory and file pattern
delete_files() {
    directory=$1
    pattern=$2
    # Find and delete files matching the pattern in the directory
    find "$directory" -name "$pattern" -exec rm -v {} \;
}

# Loop over a range of numbers and construct file patterns
for number in {1..10}; do  # Adjust the range as needed
    scene_pattern="${number}-scene*.png"
    voiceover_pattern="${number}-scene-voiceover.mp3"
    video_pattern="${number}-scene-with-text.mp4"

    # Clean up scene images
    delete_files "$scenes_dir" "$scene_pattern"

    # Clean up voiceovers
    delete_files "$voiceovers_dir" "$voiceover_pattern"

    # Clean up videos
    delete_files "$videos_dir" "$video_pattern"
done

echo "Cleanup complete."
