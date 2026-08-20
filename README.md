# Flux

A self-hosted web application for downloading videos and audio from YouTube, Instagram, TikTok, and over 1,000 other sites. Runs entirely inside a Docker container, keeping all files on your server.

## Features

- Download videos in multiple resolutions (up to 4K when available)
- Extract audio as MP3 at selectable quality levels (320k, 192k, 128k)
- Estimated file size shown before confirming a download
- Real-time download progress via Server-Sent Events
- Download completed files directly to your local machine
- Bilingual interface (Portuguese and English)
- File library with delete support

## Requirements

- Docker and Docker Compose
- Port `8484` available on the host

## Installation

### On ZimaOS via Portainer

1. Open Portainer and navigate to **Stacks**.
2. Click **Add stack** and choose **Repository**.
3. Set the repository URL to:
   ```
   https://github.com/<your-username>/flux-dl
   ```
4. Set the compose file path to `docker-compose.yml`.
5. Deploy the stack.
6. Access the interface at `http://<server-ip>:8484`.

### Manual Docker Compose

```bash
git clone https://github.com/<your-username>/flux-dl.git
cd flux-dl
docker compose up -d
```

The application will be available at `http://localhost:8484`.

### Volume and Port

By default, the container:

- Exposes port `8484`
- Saves downloaded files to `/DATA/Downloads/flux-dl` on the host

These can be changed in `docker-compose.yml`:

```yaml
ports:
  - "8484:8484"
volumes:
  - /DATA/Downloads/flux-dl:/downloads
```

## Usage

1. Paste a video URL into the input field and click **Analyze**.
2. Select whether you want video or audio, then choose the quality.
3. The estimated file size is displayed before you confirm.
4. Click **Download to Server** to start the download on the server.
5. Once complete, the file appears in the **Downloaded Files** section.
6. Click **Download to this PC** to transfer the file to your local machine.

## Supported Sites

Flux uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) internally. The full list of supported sites is available at [yt-dlp/supportedsites](https://github.com/yt-dlp/yt-dlp/blob/master/supportedsites.md).

Common examples: YouTube, Instagram, TikTok, Twitter/X, Facebook, Twitch clips, Reddit, Vimeo, SoundCloud.

## Project Structure

```
flux-dl/
├── backend/
│   ├── src/
│   │   ├── routes/         # Express route handlers
│   │   │   ├── info.js     # POST /api/info
│   │   │   ├── download.js # POST /api/download
│   │   │   ├── files.js    # GET|DELETE /api/files
│   │   │   └── events.js   # GET /api/events (SSE)
│   │   ├── services/
│   │   │   ├── ytdlp.js    # yt-dlp wrapper and progress parser
│   │   │   └── queue.js    # In-memory download queue
│   │   └── index.js        # Express entry point
│   └── package.json
├── frontend/
│   ├── css/style.css
│   ├── js/
│   │   ├── i18n.js         # pt-BR / en translations
│   │   └── app.js          # Main UI logic
│   └── index.html
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/info` | Fetch video metadata and available formats |
| `POST` | `/api/download` | Enqueue a download |
| `GET` | `/api/download` | List all jobs |
| `DELETE` | `/api/download/:id` | Remove a job |
| `GET` | `/api/files` | List downloaded files |
| `GET` | `/api/files/:filename` | Download a file to the browser |
| `DELETE` | `/api/files/:filename` | Delete a file from disk |
| `GET` | `/api/events` | SSE stream for real-time progress |
| `GET` | `/api/health` | Health check |

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Express
- **Downloader**: yt-dlp + ffmpeg
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Container**: Docker (Alpine Linux base)
- **Real-time**: Server-Sent Events (SSE)

## License

MIT
