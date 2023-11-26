#!/bin/bash

# Update and upgrade system packages
sudo apt update && sudo apt upgrade -y

# Install FFmpeg
sudo apt install ffmpeg -y

# Install Whisper
pip install -U openai-whisper