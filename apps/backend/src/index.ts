import express from "express";
import cors from "cors";
import "dotenv/config";
import YTDlpWrap from "yt-dlp-wrap";
import path from "path";
import fs from "fs";

const app = express();
let ytDlpWrap: YTDlpWrap | null = null;

let ffmpegPath: string | undefined;
try {
  ffmpegPath = require("ffmpeg-static");
} catch (e) {
  console.error("ffmpeg-static not found. Audio merging may fail.");
}

function resolveYtDlpPath(): string | null {
  if (process.env.YT_DLP_PATH && fs.existsSync(process.env.YT_DLP_PATH)) {
    console.log("Using yt-dlp from env:", process.env.YT_DLP_PATH);
    return process.env.YT_DLP_PATH;
  }

  const localPath = path.join(process.cwd(), "yt-dlp");
  if (fs.existsSync(localPath)) {
    console.log("Using locally downloaded yt-dlp:", localPath);
    return localPath;
  }

  console.error("yt-dlp binary not found. Did postinstall run?");
  return null;
}

const ytDlpPath = resolveYtDlpPath();
if (ytDlpPath) {
  ytDlpWrap = new YTDlpWrap(ytDlpPath);
}

const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Backend server is live on http://localhost:${PORT}`);
});

const buildYtDlpArgs = (url: string, format: string, extraArgs: string[] = []) => {
  const args = [url, "-f", format, ...extraArgs];
  if (ffmpegPath) {
    args.push("--ffmpeg-location", ffmpegPath);
  }
  return args;
};

const ensureYtDlpReady = (res: express.Response) => {
  if (!ytDlpWrap) {
    res.status(503).json({
      success: false,
      error: "yt-dlp is not ready yet, please try again in a few seconds.",
    });
    return false;
  }
  return true;
};

app.get("/info", async (req, res) => {
  const url = req.query.url as string;
  console.log("Fetching info for:", url);

  if (!url) {
    return res.status(400).json({ error: "No URL provided" });
  }

  try {
    const ytDlpWrap = new YTDlpWrap(path.join(process.cwd(), "yt-dlp"));
    
    const rawOutput = await ytDlpWrap.execPromise([url, "-J"]);
    console.log("yt-dlp raw output (first 200 chars):", rawOutput.slice(0, 200));

    let info;
    try {
      info = JSON.parse(rawOutput);
    } catch (jsonErr) {
      console.error("Failed to parse yt-dlp JSON:", jsonErr);
      return res.status(500).json({ 
        error: "yt-dlp returned invalid JSON", 
        raw: rawOutput 
      });
    }

    res.json(info);
  } catch (err: any) {
    console.error("Error fetching video info:", err);
    res.status(500).json({ error: err.message });
  }
});


app.get("/download-mp4", (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const itag = req.query.itag as string;
    const title = (req.query.title as string) || "video";

    res.cookie("download-status", "starting", { path: "/" });
    res.header("Content-Disposition", `attachment; filename="${encodeURIComponent(title)}.mp4"`);

    const format = `${itag}+ba`;
    ytDlpWrap!.execStream(buildYtDlpArgs(videoURL, format)).pipe(res);
  } catch (error) {
    console.error("Error downloading MP4:", error);
    res.status(500).send("Failed to download MP4.");
  }
});

app.get("/download-mp3", (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const title = (req.query.title as string) || "audio";

    res.cookie("download-status", "starting", { path: "/" });
    res.header("Content-Disposition", `attachment; filename="${encodeURIComponent(title)} (128kbps).mp3"`);

    ytDlpWrap!
      .execStream(buildYtDlpArgs(videoURL, "ba", ["-x", "--audio-format", "mp3", "--audio-quality", "5"]))
      .pipe(res);
  } catch (error) {
    console.error("Error downloading MP3:", error);
    res.status(500).send("Failed to download MP3.");
  }
});

app.get("/download-mp3-hq", (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const title = (req.query.title as string) || "audio";

    res.cookie("download-status", "starting", { path: "/" });
    res.header("Content-Disposition", `attachment; filename="${encodeURIComponent(title)} (320kbps).mp3"`);

    ytDlpWrap!
      .execStream(buildYtDlpArgs(videoURL, "ba", ["-x", "--audio-format", "mp3", "--audio-quality", "0"]))
      .pipe(res);
  } catch (error) {
    console.error("Error downloading HQ MP3:", error);
    res.status(500).send("Failed to download HQ MP3.");
  }
});
