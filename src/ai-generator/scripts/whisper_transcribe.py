import sys
import random
import whisper

# Constants
AUDIO_PATH = sys.argv[1]
OUTPUT_ASS_PATH = sys.argv[2]
FONT_PATH = "Impact"
FONT_SIZE = 18
BOTTOM_MARGIN = 90

def format_time(seconds):
    """
    Converts time in seconds to the format 'hh:mm:ss.cc'.
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    seconds = seconds % 60
    centiseconds = int((seconds - int(seconds)) * 100)
    return f"{hours:02}:{minutes:02}:{int(seconds):02}.{centiseconds:02}"

def create_ass_header(font_size=FONT_SIZE, bottom_margin=BOTTOM_MARGIN, font_path=FONT_PATH):
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
        f"Style: Default, {font_path}, {font_size}, &H00FFFFFF, &H00FFFFFF, &H00000000, &H80000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 2, 2, 10, 10, {bottom_margin}, 1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ""
    ]
    return "\n".join(header)

def random_color():
    colors = ["&H00FFFFFF", "&H0000FFFF", "&H000000FF"]  # White, Yellow, Red in BGR Hex
    return random.choice(colors)

def transcribe(audio_path=AUDIO_PATH, output_file_path=OUTPUT_ASS_PATH):
    model = whisper.load_model("base")
    print("Whisper model loaded successfully.")
    result = model.transcribe(audio_path, verbose=False)

    ass_header = create_ass_header()
    with open(output_file_path, "w") as file:
        file.write(ass_header)

        for segment in result["segments"]:
            words = segment['text'].split()
            segment_duration = segment['end'] - segment['start']
            time_per_word = segment_duration / len(words)

            current_time = segment['start']
            while words:
                num_words = random.choice([1, 2])  # Randomly choose 1 or 2 words
                selected_words = words[:num_words]
                words = words[num_words:]

                start_time = format_time(current_time)
                current_time += time_per_word * len(selected_words)
                end_time = format_time(current_time)
                subtitle_text = " ".join(selected_words)
                color = random_color()
                subtitle_line = f"Dialogue: 0,{start_time},{end_time},Default,,0000,0000,0000,,{{\\1c{color}}}{subtitle_text}\n"
                file.write(subtitle_line)

if __name__ == "__main__":
    transcribe()
