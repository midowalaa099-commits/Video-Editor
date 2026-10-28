# Video Editer

A private, browser-based video cutter with Arabic and English controls. Choose a local video, mark sections to remove, preview the result, and download a new MP4.

## Run locally

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

The build copies the pinned single-thread FFmpeg WebAssembly engine from its npm package into `public/ffmpeg/`; the engine is served from the same origin. It is not fetched from a CDN at runtime.

## Use

1. Choose an MP4, MOV or WebM file that your browser can preview.
2. Press **I** to mark the start and **O** to mark the end of a removal. You can also type exact times.
3. Remove the marked section; restore or undo any manual cut.
4. Preview with removed sections skipped.
5. Export and download a new MP4.

## Privacy and practical limits

- Video bytes remain in your browser; no media-upload API, account or storage service exists.
- Only cut metadata is saved in localStorage, keyed by filename, size and last-modified date.
- Browser memory varies; the interface accepts files up to 500 MiB and 100 cuts. Large/long/4K files can still exceed available memory.
- The export engine is about 32 MB on first use. Export is slower than native FFmpeg and depends on your device; keep the tab open.
- Input preview depends on codecs supported by the browser. H.264 MP4 is the most compatible choice.
- Exports are re-encoded to H.264 High/yuv420p, 30 fps, CRF 18/fast, with AAC 192 kbps stereo 48 kHz when the input has audio. Silent sources remain silent. Source aspect and pixel dimensions are retained, with at most one pixel of padding for odd dimensions.
- Cuts snap to output frames. Audio joins use 15 ms outgoing handles/crossfades without shortening the timeline.
- Export can be cancelled; a later export starts with a fresh worker.

## Vercel

Import this Git repository into Vercel and use the Vite preset. The checked-in `vercel.json` sets `npm ci`, `npm run build` and `dist`. There are no environment variables or server functions.

## Tests

`npm test` checks cut normalization and export arguments. Optional native end-to-end checks require installed FFmpeg/FFprobe:

```sh
VIDEO_CUTTER_NATIVE_TESTS=1 npm test
```

Browser smoke tests should also verify a real WebAssembly export with and without audio, cancellation/retry and responsive Arabic controls. Test media is kept outside the repository.

Use the header switch to choose Arabic or English; the site remembers the choice.

See `THIRD_PARTY_NOTICES.md` for the export engine licenses and corresponding source links.

The deployed license copy is available at `/licenses/GPL-2.0.txt`.
