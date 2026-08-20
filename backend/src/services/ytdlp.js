const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const DOWNLOADS_DIR = process.env.DOWNLOADS_DIR || path.join(process.cwd(), 'downloads');

/**
 * Ensure the downloads directory exists.
 */
function ensureDownloadsDir() {
  if (!fs.existsSync(DOWNLOADS_DIR)) {
    fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
  }
}

/**
 * Run yt-dlp and return its stdout as a string.
 * @param {string[]} args
 * @returns {Promise<string>}
 */
function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('yt-dlp', args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0) {
        const errorMsg = stderr.trim() || `yt-dlp exited with code ${code}`;
        reject(new Error(errorMsg));
      } else {
        resolve(stdout);
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });
  });
}

/**
 * Fetch video metadata and available formats.
 * @param {string} url
 * @returns {Promise<object>}
 */
async function getInfo(url) {
  const raw = await runYtDlp([
    '--dump-json',
    '--no-playlist',
    '--skip-download',
    url,
  ]);

  const data = JSON.parse(raw.trim().split('\n')[0]); // first entry in case of playlist

  const formats = (data.formats || []).filter(
    (f) => f.vcodec !== 'none' || f.acodec !== 'none'
  );

  // Build a deduplicated list of available video heights
  const videoHeights = [
    ...new Set(
      formats
        .filter((f) => f.vcodec !== 'none' && f.height)
        .map((f) => f.height)
    ),
  ].sort((a, b) => b - a);

  // Estimate sizes per resolution (video+audio combined)
  const videoOptions = videoHeights.map((height) => {
    const videoFormat = formats
      .filter((f) => f.height === height && f.vcodec !== 'none')
      .sort((a, b) => (b.filesize || b.filesize_approx || 0) - (a.filesize || a.filesize_approx || 0))[0];

    const audioFormat = formats
      .filter((f) => f.acodec !== 'none' && f.vcodec === 'none')
      .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

    const videoSize = videoFormat
      ? videoFormat.filesize || videoFormat.filesize_approx || null
      : null;
    const audioSize = audioFormat
      ? audioFormat.filesize || audioFormat.filesize_approx || null
      : null;

    const estimatedSize =
      videoSize !== null && audioSize !== null
        ? videoSize + audioSize
        : videoSize || audioSize || null;

    return {
      type: 'video',
      label: `${height}p`,
      height,
      estimatedSize,
      formatSpec: `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=${height}]+bestaudio/best[height<=${height}]`,
    };
  });

  // Audio-only options
  const bestAudioFormat = formats
    .filter((f) => f.acodec !== 'none' && f.vcodec === 'none')
    .sort((a, b) => (b.abr || 0) - (a.abr || 0))[0];

  const audioBaseSize = bestAudioFormat
    ? bestAudioFormat.filesize || bestAudioFormat.filesize_approx || null
    : null;

  const audioOptions = [
    { type: 'audio', label: 'MP3 320k', quality: '0', estimatedSize: audioBaseSize, formatSpec: 'bestaudio/best' },
    { type: 'audio', label: 'MP3 192k', quality: '5', estimatedSize: audioBaseSize ? Math.round(audioBaseSize * 0.6) : null, formatSpec: 'bestaudio/best' },
    { type: 'audio', label: 'MP3 128k', quality: '7', estimatedSize: audioBaseSize ? Math.round(audioBaseSize * 0.4) : null, formatSpec: 'bestaudio/best' },
  ];

  return {
    id: data.id,
    title: data.title,
    uploader: data.uploader || data.channel || null,
    thumbnail: data.thumbnail,
    duration: data.duration,
    durationString: data.duration_string,
    webpage_url: data.webpage_url || url,
    videoOptions,
    audioOptions,
  };
}

/**
 * Download a video/audio and report progress via a callback.
 * @param {object} job - The download job
 * @param {function} onUpdate - Called with partial updates
 * @returns {Promise<string>} - Final output filepath
 */
function downloadMedia(job, onUpdate) {
  ensureDownloadsDir();

  return new Promise((resolve, reject) => {
    const safeTitle = (job.title || 'download')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 120);

    const outputTemplate = path.join(DOWNLOADS_DIR, `${safeTitle}_%(id)s.%(ext)s`);

    let args;

    if (job.mode === 'audio') {
      args = [
        '--no-playlist',
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', job.audioQuality || '0',
        '--newline',
        '--progress',
        '-o', outputTemplate,
        job.url,
      ];
    } else {
      args = [
        '--no-playlist',
        '-f', job.formatSpec,
        '--merge-output-format', 'mp4',
        '--newline',
        '--progress',
        '-o', outputTemplate,
        job.url,
      ];
    }

    // Regex to parse yt-dlp progress lines:
    // [download]  45.3% of   89.45MiB at   2.34MiB/s ETA 00:23
    const progressRegex = /\[download\]\s+([\d.]+)%\s+of\s+([\d.]+\s*\S+)\s+at\s+([\d.]+\s*\S+\/s)\s+ETA\s+(\S+)/;
    const doneRegex = /\[download\]\s+100%/;

    let outputFile = null;
    // Capture the destination file from yt-dlp output
    const destRegex = /\[Merger\] Merging formats into "(.+)"|(?:Destination|output): (.+\.(?:mp4|webm|mp3|m4a|opus|flac))/i;
    const movedRegex = /\[download\] (.+) has already been downloaded/;
    const ffmpegDestRegex = /\[ffmpeg\] Destination: (.+)/i;

    const proc = spawn('yt-dlp', args);

    proc.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        const progressMatch = line.match(progressRegex);
        if (progressMatch) {
          onUpdate({
            progress: parseFloat(progressMatch[1]),
            size: progressMatch[2],
            speed: progressMatch[3],
            eta: progressMatch[4],
          });
        }

        if (doneRegex.test(line)) {
          onUpdate({ progress: 100 });
        }

        const destMatch = line.match(destRegex);
        if (destMatch) {
          outputFile = (destMatch[1] || destMatch[2]).trim();
        }

        const ffmpegMatch = line.match(ffmpegDestRegex);
        if (ffmpegMatch) {
          outputFile = ffmpegMatch[1].trim();
        }

        const movedMatch = line.match(movedRegex);
        if (movedMatch) {
          outputFile = movedMatch[1].trim();
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      const line = chunk.toString();
      // Some info comes through stderr — not necessarily errors
      const destMatch = line.match(destRegex);
      if (destMatch) {
        outputFile = (destMatch[1] || destMatch[2]).trim();
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }

      // If we couldn't capture the output filename, try to find the most recent file
      if (!outputFile) {
        try {
          const files = fs.readdirSync(DOWNLOADS_DIR)
            .map((name) => ({
              name,
              mtime: fs.statSync(path.join(DOWNLOADS_DIR, name)).mtimeMs,
            }))
            .sort((a, b) => b.mtime - a.mtime);

          if (files.length > 0) {
            outputFile = path.join(DOWNLOADS_DIR, files[0].name);
          }
        } catch (_) {
          // ignore
        }
      }

      resolve(outputFile);
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`));
    });
  });
}

module.exports = { getInfo, downloadMedia, DOWNLOADS_DIR };
