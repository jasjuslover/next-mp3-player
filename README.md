# MP3 Streamer

Next.js single-page tool that turns a JSON playlist into a streaming queue. Paste an array of tracks and the app will parse it, spin up a playlist, and keep audio playing while you continue to browse the page. The UI is built with Tailwind CSS v4 and the latest shadcn/ui primitives.

## Getting started

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000 to paste your playlist JSON.

## Playlist formats

### JSON

Provide an array (or an object with a `tracks` array) where each track has at least one playable URL:

```json
[
  {
    "title": "My Stream",
    "artist": "Example FM",
    "streamUrl": "https://mycdn.example.com/live.mp3"
  },
  {
    "title": "Backup",
    "url": "https://backup.example.com/stream.mp3"
  }
]
```

Supported URL keys: `streamUrl`, `url`, or `href`. Optional keys: `title`, `name`, `artist`, `performer`, `artwork`, and `cover`.

### Raw URLs

If you just want to stream a couple of links (even long YouTube CDN URLs like the one in the prompt), paste them directly into the JSON textarea separated by new lines or spaces. The player will convert every `http(s)` link into a playlist entry automatically. You can also use the quick link insert form to add a single URL along with an optional custom title without touching the JSON input.

### Exporting

Whenever the queue has at least one track you can scroll to the Export card, inspect the generated JSON, and press **Copy JSON** to grab the playlist for reuse elsewhere.

## Features

- Parses playlists entirely on the client—no uploads needed.
- Persists playback while users interact with the builder UI.
- Auto-advances to the next stream when the current source ends.
- Handles browsers that block autoplay by surfacing a "press play" message when required.
- Supports appending new JSON/URL snippets to the active queue and clearing the queue in one click.
- Provides a dedicated quick link form with optional titles for manual stream insertion.
- Exports the current queue back to JSON so you can save or share the generated playlist.
