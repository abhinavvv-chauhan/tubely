const YTDlpWrap = require("yt-dlp-wrap");
const path = require("path");
const fs = require("fs");

const ytDlpBinaryPath = path.join(process.cwd(), "yt-dlp");

(async () => {
  try {
    if (!fs.existsSync(ytDlpBinaryPath)) {
      console.log("Downloading yt-dlp binary at build time...");
      await YTDlpWrap.downloadFromGithub(ytDlpBinaryPath);
      console.log("yt-dlp binary downloaded.");
    } else {
      console.log("yt-dlp binary already exists, skipping download.");
    }
  } catch (err) {
    console.error("Failed to download yt-dlp binary:", err);
    process.exit(1);
  }
})();
