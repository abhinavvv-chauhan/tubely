import express, { Request, Response } from "express";
import cors from "cors";
import { exec, spawn } from "child_process";
import path from "path";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/info", async (req: Request, res: Response) => {
  const videoUrl = req.query.url as string;

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing video URL" });
  }

  console.log("Fetching info for:", videoUrl);

  const cmd = `yt-dlp -j --no-warnings --add-header "referer:youtube.com" --add-header "user-agent:Mozilla/5.0" ${videoUrl}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error("yt-dlp error:", stderr || error.message);
      return res.status(500).json({ error: "Failed to fetch video info" });
    }

    try {
      const info = JSON.parse(stdout);
      res.json(info);
    } catch (err) {
      console.error("Failed to parse yt-dlp JSON:", err);
      res.status(500).json({ error: "Failed to parse video info" });
    }
  });
});

app.get("/download", (req: Request, res: Response) => {
  const videoUrl = req.query.url as string;
  const format = (req.query.format as string) || "bestaudio";

  if (!videoUrl) {
    return res.status(400).json({ error: "Missing video URL" });
  }

  console.log(`Downloading ${format} for:`, videoUrl);

  res.setHeader("Content-Disposition", "attachment; filename=video.mp3");

  const child = spawn("yt-dlp", [
    "-f",
    format,
    "-o",
    "-",
    "--no-warnings",
    "--add-header",
    "referer:youtube.com",
    "--add-header",
    "user-agent:Mozilla/5.0",
    videoUrl,
  ]);

  child.stdout.pipe(res);

  child.stderr.on("data", (data) => {
    console.error("yt-dlp stderr:", data.toString());
  });

  child.on("close", (code) => {
    if (code !== 0) {
      console.error(`yt-dlp process exited with code ${code}`);
      if (!res.headersSent) {
        res.status(500).end("Download failed");
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
