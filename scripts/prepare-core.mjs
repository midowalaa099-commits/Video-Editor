import { mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'public/ffmpeg');
await mkdir(target, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) { await copyFile(resolve(root, 'node_modules/@ffmpeg/core/dist/esm', file), resolve(target, file)); }
console.log('Local browser video engine prepared.');
