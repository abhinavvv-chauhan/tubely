const https = require('https');
const fs = require('fs');
const path = require('path');
const { chmodSync } = require('fs');

const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
const outputPath = path.join(process.cwd(), 'yt-dlp');

console.log("Downloading yt-dlp binary from:", YT_DLP_URL);

https.get(YT_DLP_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error(`Failed to download yt-dlp: Status ${response.statusCode}`);
    process.exit(1);
  }

  const file = fs.createWriteStream(outputPath, { mode: 0o755 });
  response.pipe(file);

  file.on('finish', () => {
    file.close();
    chmodSync(outputPath, 0o755);
    console.log(" yt-dlp binary downloaded successfully:", outputPath);
  });
}).on('error', (err) => {
  console.error("Error downloading yt-dlp:", err.message);
  process.exit(1);
});
