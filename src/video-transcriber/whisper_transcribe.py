# whisper_transcribe.py
import sys
import json
import whisper

def transcribe(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)

    scenes = []
    for i, segment in enumerate(result["segments"]):
        scene = {
            "SceneNumber": i + 1,
            "Duration": str(int(segment['end'] - segment['start'])),
            "VoiceOverText": segment['text'],
            "Description": "",  # Placeholder for scene description
            "Text": segment['text']
        }
        scenes.append(scene)

    video_script = {
        "Title": "Your Video Title",  # Update as needed
        "Description": "Your Video Description",  # Update as needed
        "Scenes": scenes
    }

    return video_script

if __name__ == "__main__":
    audio_file_path = sys.argv[1]
    json_output_path = sys.argv[2]
    
    script_content = transcribe(audio_file_path)
    with open(json_output_path, 'w') as json_file:
        json.dump(script_content, json_file, indent=4)
