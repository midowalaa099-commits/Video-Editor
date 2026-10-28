import { FFmpeg } from '@ffmpeg/ffmpeg';
import { buildExportArgs, getKeptSegments } from './cuts.js';

let exporting = false;
const MAX_INPUT_BYTES = 2 * 1024 ** 3;

function aborted() {
  return new DOMException('Export cancelled.', 'AbortError');
}

function notify(callback, value) {
  if (typeof callback === 'function') {
    try { callback(value); } catch { /* UI callbacks must not interrupt encoding. */ }
  }
}

function readableError(logs, original) {
  const details = `${logs.join('\n')}\n${original?.message || original}`;
  if (/out of memory|memory access|cannot enlarge|allocation failed|aborted\(oom\)/i.test(details)) {
    return new Error('The browser ran out of memory. Try a shorter video or a lower-resolution copy.');
  }
  if (/unknown decoder|decoder .* not found|unsupported codec|invalid data found/i.test(details)) {
    return new Error('This video format could not be decoded. Try an MP4 with H.264 video.');
  }
  return original instanceof Error ? original : new Error('The video could not be exported. Please try again.');
}

function downloadName(name) {
  const stem = String(name || 'video').replace(/\.[^.]+$/, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim();
  return `${stem || 'video'}-edited.mp4`;
}

async function probe(engine, inputName, metadataName, signal) {
  const result = await engine.ffprobe([
    '-v', 'error', '-show_entries',
    'format=duration:stream=index,codec_type,codec_name,width,height,duration,nb_frames',
    '-of', 'json', inputName, '-o', metadataName,
  ], -1, { signal });
  // core 0.12.10 can leave its return register at -1 after a successful
  // ffprobe call (upstream issue 817). Validate the freshly generated JSON
  // instead of treating that sentinel alone as a failed probe.
  if (result !== 0 && result !== -1) {
    throw new Error(`The video details could not be read (probe status ${result}).`);
  }
  let metadata;
  try {
    const data = await engine.readFile(metadataName, 'binary', { signal });
    metadata = JSON.parse(new TextDecoder().decode(data));
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw aborted();
    throw new Error(`The video details could not be read (probe status ${result}).`);
  }
  if (!metadata.streams?.some((stream) => stream.codec_type === 'video'
      && Number(stream.width) > 0 && Number(stream.height) > 0)) {
    throw new Error('This file does not contain a readable video track.');
  }
  return metadata;
}

/**
 * Export a local File without uploading media. The single-thread core is hosted
 * on this origin; the FFmpeg class creates its Vite-bundled module worker.
 * Each run owns its worker, so cancellation terminates immediately and the next
 * run starts cleanly. Terminating after success also releases the WASM heap.
 */
export async function exportVideo({ file, duration, cuts = [], onProgress, onMessage, signal } = {}) {
  if (exporting) throw new Error('An export is already running. Cancel it before starting another.');
  if (!file || typeof file.arrayBuffer !== 'function' || !Number.isFinite(file.size) || file.size <= 0) {
    throw new TypeError('Choose a local video file first.');
  }
  if (file.size >= MAX_INPUT_BYTES) {
    throw new RangeError('Browser export supports files smaller than 2 GB. Choose a smaller copy.');
  }
  // Validate before downloading the engine or reading the whole file into RAM.
  if (!getKeptSegments(cuts, duration).length) {
    throw new RangeError('These cuts remove the whole video. Restore a section to export.');
  }
  if (signal?.aborted) throw aborted();
  exporting = true;
  const engine = new FFmpeg();
  const logs = [];
  let terminated = false;
  let outputDuration = 0;
  let lastProgress = 0;
  let stage = 'initialization';
  const reportProgress = (value) => {
    lastProgress = Math.max(lastProgress, Math.min(1, Math.max(0, value)));
    notify(onProgress, lastProgress);
  };
  const terminate = () => {
    if (!terminated) {
      terminated = true;
      engine.terminate();
    }
  };
  const onAbort = () => terminate();
  const onLog = ({ message }) => {
    logs.push(message);
    if (logs.length > 30) logs.shift();
  };
  const onEngineProgress = ({ time }) => {
    // FFmpeg's ratio assumes equal input/output duration. Its encoded output
    // time is suitable for this shorter timeline; reserve the end for reading.
    if (outputDuration > 0 && Number.isFinite(time)) {
      reportProgress(0.08 + 0.87 * Math.min(1, time / 1_000_000 / outputDuration));
    }
  };
  engine.on('log', onLog);
  engine.on('progress', onEngineProgress);
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    notify(onMessage, 'Loading the local export engine…');
    reportProgress(0);
    stage = 'loading engine';
    await engine.load({ coreURL: '/ffmpeg/ffmpeg-core.js', wasmURL: '/ffmpeg/ffmpeg-core.wasm' }, { signal });
    if (signal?.aborted) throw aborted();
    reportProgress(0.03);
    notify(onMessage, 'Reading your video on this device…');
    const extension = file.name?.match(/\.([a-z0-9]{1,8})$/i)?.[1]?.toLowerCase() || 'video';
    const inputName = `source.${extension}`;
    const outputName = 'edited.mp4';
    stage = 'reading local file';
    const data = new Uint8Array(await file.arrayBuffer());
    if (signal?.aborted) throw aborted();
    stage = 'copying file into engine';
    await engine.writeFile(inputName, data, { signal });
    stage = 'probing source';
    const metadata = await probe(engine, inputName, 'source-metadata.json', signal);
    const video = metadata.streams.find((stream) => stream.codec_type === 'video');
    const measuredDuration = Number(video.duration || metadata.format?.duration);
    const verifiedDuration = Number.isFinite(measuredDuration) && measuredDuration > 0
      ? Math.min(duration, measuredDuration) : duration;
    const kept = getKeptSegments(cuts, verifiedDuration);
    if (!kept.length) throw new RangeError('These cuts remove the whole video. Restore a section to export.');
    outputDuration = kept.reduce((sum, segment) => sum + segment.end - segment.start, 0);
    const hasAudio = metadata.streams.some((stream) => stream.codec_type === 'audio');
    reportProgress(0.08);
    notify(onMessage, hasAudio ? 'Exporting your cuts…' : 'Exporting your cuts — this video has no audio track…');
    stage = 'encoding MP4';
    const result = await engine.exec(buildExportArgs({
      inputName, outputName, duration: verifiedDuration, cuts, hasAudio,
    }), -1, { signal });
    if (signal?.aborted) throw aborted();
    if (result !== 0) throw new Error('The video could not be exported. Try a shorter copy or another format.');
    reportProgress(0.96);
    notify(onMessage, 'Checking the finished MP4…');
    stage = 'probing finished MP4';
    const finished = await probe(engine, outputName, 'output-metadata.json', signal);
    const finalVideo = finished.streams.find((stream) => stream.codec_type === 'video');
    const actualFrames = Number(finalVideo.nb_frames);
    const expectedFrames = Math.round(outputDuration * 30);
    if (Number.isFinite(actualFrames) && actualFrames !== expectedFrames) {
      throw new Error('The output frame count did not match the edit. Try converting the source to MP4 first.');
    }
    stage = 'reading finished MP4';
    const output = await engine.readFile(outputName, 'binary', { signal });
    if (signal?.aborted) throw aborted();
    if (!output.byteLength) throw new Error('The export produced an empty file. Please try again.');
    const blob = new Blob([output], { type: 'video/mp4' });
    reportProgress(1);
    notify(onMessage, 'Your edited MP4 is ready.');
    return { blob, filename: downloadName(file.name) };
  } catch (error) {
    if (signal?.aborted || error?.name === 'AbortError') throw aborted();
    // Diagnostics stay in this browser; no media bytes, original filename or local paths.
    console.error(`Video export failed ${JSON.stringify({
      stage, error: { name: error?.name || 'Error', message: String(error?.message || error) },
      ffmpeg: [...logs],
    })}`);
    throw readableError(logs, error);
  } finally {
    signal?.removeEventListener('abort', onAbort);
    engine.off('log', onLog);
    engine.off('progress', onEngineProgress);
    terminate();
    exporting = false;
  }
}
