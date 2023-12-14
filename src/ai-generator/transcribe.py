import os
import subprocess
import sys
import logging

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# Get the path of the audio file from the command line arguments
if len(sys.argv) != 2:
    print("Usage: python transcribe.py <audio_file>")
    sys.exit(1)

audio_file = sys.argv[1]

logging.info("Starting Python Script Execution")

# Load the audio file using FFmpeg
def load_audio(audio_file):
    logging.info(f"Loading audio file: {audio_file}")
    cmd = [
        "ffmpeg",
        "-i", audio_file,
        "-f", "s16le",
        "-ac", "1",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-"
    ]

    try:
        out = subprocess.run(cmd, capture_output=True, check=True, text=True)
        return out.stdout
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to load audio: {e.stderr}")
        raise RuntimeError(f"Failed to load audio: {e.stderr}") from e

logging.info("Python Script Execution Completed")

# Load the audio
audio = load_audio(audio_file)

# Perform transcription or other processing here
# You can use the 'audio' variable for further processing

# Example: Print the length of the audio
print("Audio length:", len(audio), "bytes")
