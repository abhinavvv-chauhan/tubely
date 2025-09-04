import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

const app = express();
let ytDlpWrap: YTDlpWrap | null = null;

let ffmpegPath: string | undefined;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  console.error("ffmpeg-static not found. Audio merging will likely fail.");
}

const ytDlpBinaryPath = path.join(process.cwd(), 'yt-dlp');

(async () => {
  try {
    if (!fs.existsSync(ytDlpBinaryPath)) {
      console.log('Downloading yt-dlp binary...');
      await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
      console.log('yt-dlp binary downloaded.');
    } else {
      console.log('yt-dlp binary already exists, reusing it.');
    }

    ytDlpWrap = new YTDlpWrap(ytDlpBinaryPath);
    console.log('yt-dlp binary is ready at:', ytDlpBinaryPath);
  } catch (error) {
    console.error('Failed to download or verify yt-dlp binary:', error);
  }
})();

const PORT = process.env.PORT || 4000;
app.use(cors());
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Backend server is live on http://localhost:${PORT}`);
});

const buildYtDlpArgs = (url: string, format: string, extraArgs: string[] = []) => {
  const args = [url, '-f', format, ...extraArgs];
  if (ffmpegPath) {
    args.push('--ffmpeg-location', ffmpegPath);
  }
  return args;
};

const ensureYtDlpReady = (res: express.Response) => {
  if (!ytDlpWrap) {
    res.status(503).json({ success: false, error: "yt-dlp is not ready yet, please try again in a few seconds." });
    return false;
  }
  return true;
};


app.get('/info', async (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    if (!videoURL) {
      return res.status(400).json({ success: false, error: "URL is required" });
    }

    const stdout = await ytDlpWrap!.execPromise([videoURL, '--dump-json']);
    const metadata = JSON.parse(stdout);

    const standardResolutions = [1080, 720, 480, 360, 240];
    const uniqueFormats = new Map();

    metadata.formats.forEach((format: any) => {
      if (format.ext === 'mp4' && format.vcodec !== 'none' && standardResolutions.includes(format.height)) {
        if (!uniqueFormats.has(format.height)) {
          uniqueFormats.set(format.height, {
            itag: format.format_id,
            qualityLabel: `${format.height}p`,
            container: format.ext
          });
        }
      }
    });

    const cleanedFormats = Array.from(uniqueFormats.values()).sort((a: any, b: any) =>
      b.qualityLabel.localeCompare(a.qualityLabel, undefined, { numeric: true })
    );

    res.json({
      success: true,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      formats: cleanedFormats
    });
  } catch (error) {
    console.error("Error fetching video info:", error);
    res.status(500).json({ success: false, error: "Failed to fetch video information." });
  }
});

app.get('/download-mp4', (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const itag = req.query.itag as string;
    const title = (req.query.title as string) || 'video';

    res.cookie('download-status', 'starting', { path: '/' });
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(title)}.mp4"`);

    const format = `${itag}+ba`;
    ytDlpWrap!.execStream(buildYtDlpArgs(videoURL, format)).pipe(res);
  } catch (error) {
    console.error("Error downloading MP4:", error);
    res.status(500).send('Failed to download MP4.');
  }
});

app.get('/download-mp3', (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const title = (req.query.title as string) || 'audio';

    res.cookie('download-status', 'starting', { path: '/' });
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(title)} (128kbps).mp3"`);

    ytDlpWrap!.execStream(buildYtDlpArgs(videoURL, 'ba', ['-x', '--audio-format', 'mp3', '--audio-quality', '5'])).pipe(res);
  } catch (error) {
    console.error("Error downloading MP3:", error);
    res.status(500).send('Failed to download MP3.');
  }
});

app.get('/download-mp3-hq', (req, res) => {
  if (!ensureYtDlpReady(res)) return;

  try {
    const videoURL = req.query.url as string;
    const title = (req.query.title as string) || 'audio';

    res.cookie('download-status', 'starting', { path: '/' });
    res.header('Content-Disposition', `attachment; filename="${encodeURIComponent(title)} (320kbps).mp3"`);

    ytDlpWrap!.execStream(buildYtDlpArgs(videoURL, 'ba', ['-x', '--audio-format', 'mp3', '--audio-quality', '0'])).pipe(res);
  } catch (error) {
    console.error("Error downloading HQ MP3:", error);
    res.status(500).send('Failed to download HQ MP3.');
  }
});
