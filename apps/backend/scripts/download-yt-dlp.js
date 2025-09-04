const fs = require("fs");
const https = require("https");
const path = require("path");

const dest = path.join(process.cwd(), "yt-dlp");

https.get(
  {
    hostname: "api.github.com",
    path: "/repos/yt-dlp/yt-dlp/releases/latest",
    headers: { "User-Agent": "node" },
  },
  (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const release = JSON.parse(data);
      const asset = release.assets.find((a) => a.name === "yt-dlp");
      if (!asset) {
        console.error("yt-dlp binary not found in release.");
        process.exit(1);
      }

      console.log("⬇Downloading:", asset.browser_download_url);
      https.get(asset.browser_download_url, (dlRes) => {
        const file = fs.createWriteStream(dest, { mode: 0o755 });
        dlRes.pipe(file);
        file.on("finish", () => {
          file.close();
          console.log("yt-dlp downloaded to", dest);
        });
      });
    });
  }
);
