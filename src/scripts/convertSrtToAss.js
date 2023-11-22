const fs = require("fs");

const srtContent = `1
00:00:00,000 --> 00:00:01,500
For www.forom.com

2
00:00:01,500 --> 00:00:02,500
Tonight's the night.

3
00:00:03,000 --> 00:00:15,000
And it's going to happen
again and again --`;

function srtToAss(srt) {
  const colors = ["&H00FFFFFF", "&H0000FF&", "&H00FFFF"]; // White, Red, Yellow
  const dialogues = srt.split("\n\n").map((section) => {
    const [index, time, ...textLines] = section.split("\n");
    const text = textLines.join(" ").toUpperCase();
    const [start, end] = time.split(" --> ");
    const assStart = start.replace(",", ".");
    const assEnd = end.replace(",", ".");

    const words = text.split(" ");
    const assLines = [];
    for (let i = 0; i < words.length; i += 3) {
      const wordSet = words.slice(i, i + 3);
      wordSet.forEach((word, index) => {
        const color = colors[Math.floor(Math.random() * colors.length)];
        assLines.push(
          `Dialogue: 0,${assStart},${assEnd},Default,,0000,0000,0000,,{\\pos(${
            500 + index * 100
          },1820)\\1c${color}\\3c&H000000&\\bord4\\shad0}${word}`
        );
      });
    }
    return assLines;
  });

  return dialogues.flat().join("\n");
}

const assHeader = `[Script Info]
Title: Custom Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default, Arial, 48, &H00FFFFFF, &H000000FF, &H00000000, &H64000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 4, 0, 2, 10, 10, 100, 0

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

const assContent = `${assHeader}\n${srtToAss(srtContent)}`;

fs.writeFile("output.ass", assContent, "utf8", (err) => {
  if (err) {
    console.error("Error writing ASS file:", err);
    return;
  }
  console.log("ASS file created successfully.");
});
