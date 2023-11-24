import sys
import whisper
import random

def format_time(seconds):
    """
    Converts time in seconds to the format 'hh:mm:ss.cc'.
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    centiseconds = int((seconds - int(seconds)) * 100)  # Convert milliseconds to centiseconds
    formatted_time = f"{hours:02}:{minutes:02}:{int(seconds):02}.{centiseconds:02}"  # Note the change from comma to dot
    return formatted_time

def create_ass_header(font_size=18, bottom_margin=50, font_path="/Users/sreekantht/Desktop/Sreekanth/GitHub/shorts-choreographer/src/data/input/fonts/impact.ttf"):
    header = [
        "[Script Info]",
        "Title: Whisper Transcription",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        "YCbCr Matrix: TV.601",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,Impact,{font_size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,2,2,10,10,{bottom_margin},1",
        # Added a semi-transparent black background (&H80000000) and set font to Impact
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ""
    ]
    return "\n".join(header)

def get_random_color():
    colors = ["&H00FFFFFF", "&H0000FFFF", "&H000000FF"]  # White, Yellow, Red
    return random.choice(colors)

def transcribe(audio_path, output_file_path):
    model = whisper.load_model("base")
    print("Whisper model loaded successfully.")
    result = model.transcribe(audio_path, verbose=False)

    ass_header = create_ass_header(font_size=18, bottom_margin=50)  # Adjust font size and bottom margin here
    with open(output_file_path, "w") as file:
        file.write(ass_header)

        for segment in result["segments"]:
            words = segment['text'].split()
            segment_duration = segment['end'] - segment['start']
            time_per_word = segment_duration / len(words)

            current_time = segment['start']
            for word in words:
                start_time = format_time(current_time)
                current_time += time_per_word
                end_time = format_time(current_time)
                color = get_random_color()  # Get a random color for each word
                file.write(f"Dialogue: 0,{start_time},{end_time},Default,,0000,0000,0000,,{{\\c{color}}}{word}{{\\3c&H000000&}}{{\\alpha&H80&}}\n")

if __name__ == "__main__":
    audio_path = sys.argv[1]
    output_ass_path = sys.argv[2]  # Second argument for the output ASS file path
    transcribe(audio_path, output_ass_path)
