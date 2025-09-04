// scripts/download-yt-dlp.js
const https = require("https");
const fs = require("fs");
const path = require("path");

const YT_DLP_URL = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
const outputPath = path.join(process.cwd(), "yt-dlp");

function download(url, dest, cb) {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      console.log("Redirecting to:", res.headers.location);
      return download(res.headers.location, dest, cb);
    }

    if (res.statusCode !== 200) {
      return cb(new Error(`Failed to download yt-dlp: Status ${res.statusCode}`));
    }

    const file = fs.createWriteStream(dest, { mode: 0o755 });
    res.pipe(file);

    file.on("finish", () => {
      file.close(cb);
    });
  }).on("error", (err) => {
    cb(err);
  });
}

console.log("Downloading yt-dlp binary from:", YT_DLP_URL);
download(YT_DLP_URL, outputPath, (err) => {
  if (err) {
    console.error("Error downloading yt-dlp:", err.message);
    process.exit(1);
  } else {
    console.log(" yt-dlp binary downloaded successfully:", outputPath);
  }
});
