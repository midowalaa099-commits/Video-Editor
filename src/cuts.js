export const EXPORT_FPS = 30;
export const MAX_CUTS = 100;

function frameCount(duration, fps) {
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new RangeError('The video needs a valid duration before it can be edited.');
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new RangeError('The frame rate must be a whole number from 1 to 120.');
  }
  const frames = Math.floor(duration * fps + 1e-7);
  if (frames < 1) throw new RangeError('The video is shorter than one output frame.');
  return frames;
}

/** Clamp, snap to the nearest frame, sort and merge removal ranges. */
export function normalizeCuts(cuts, duration, fps = EXPORT_FPS) {
  const frames = frameCount(duration, fps);
  if (!Array.isArray(cuts)) throw new TypeError('Cuts must be a list of time ranges.');
  if (cuts.length > MAX_CUTS) {
    throw new RangeError(`Keep the edit to ${MAX_CUTS} cuts or fewer.`);
  }
  const ranges = cuts.map((cut) => {
    const start = Array.isArray(cut) ? cut[0] : cut?.start;
    const end = Array.isArray(cut) ? cut[1] : cut?.end;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      throw new RangeError('Each cut needs a finite end time after its start time.');
    }
    return {
      start: Math.max(0, Math.min(frames, Math.round(start * fps))),
      end: Math.max(0, Math.min(frames, Math.round(end * fps))),
    };
  }).filter((cut) => cut.end > cut.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged = [];
  for (const cut of ranges) {
    const previous = merged.at(-1);
    if (previous && cut.start <= previous.end) previous.end = Math.max(previous.end, cut.end);
    else merged.push({ ...cut });
  }
  return merged.map((cut) => ({ start: cut.start / fps, end: cut.end / fps }));
}

/** Return the chronological complement of normalized removal ranges. */
export function getKeptSegments(cuts, duration, fps = EXPORT_FPS) {
  const frames = frameCount(duration, fps);
  const normalized = normalizeCuts(cuts, duration, fps);
  const kept = [];
  let cursor = 0;
  for (const cut of normalized) {
    const start = Math.round(cut.start * fps);
    const end = Math.round(cut.end * fps);
    if (start > cursor) kept.push({ start: cursor / fps, end: start / fps });
    cursor = end;
  }
  if (cursor < frames) kept.push({ start: cursor / fps, end: frames / fps });
  return kept;
}

/**
 * Build a shell-free FFmpeg command shared by the browser and native tests.
 * Video has hard cuts. Every outgoing audio segment has a 720-sample tail
 * handle; the 720-sample crossfade consumes that handle rather than shortening
 * the output or shifting later speech relative to the picture.
 */
export function buildExportArgs({
  inputName = 'input.mp4', outputName = 'edited.mp4', duration,
  cuts = [], hasAudio = true, fps = EXPORT_FPS,
}) {
  if (fps !== EXPORT_FPS) throw new RangeError('MP4 export uses 30 frames per second.');
  const kept = getKeptSegments(cuts, duration, fps);
  if (!kept.length) throw new RangeError('These cuts remove the whole video. Restore a section to export.');
  const totalFrames = frameCount(duration, fps);
  const outputFrames = kept.reduce((sum, segment) => (
    sum + Math.round((segment.end - segment.start) * fps)
  ), 0);
  const samplesPerFrame = 48000 / fps;
  const outputSamples = outputFrames * samplesPerFrame;
  const selection = kept.map(({ start, end }) => (
    `between(n\\,${Math.round(start * fps)}\\,${Math.round(end * fps) - 1})`
  )).join('+');
  const filters = [
    `[0:v:0]fps=fps=${fps}:start_time=0,select=${selection},setpts=N/(${fps}*TB),`
    + 'pad=w=ceil(iw/2)*2:h=ceil(ih/2)*2:x=0:y=0:color=black,format=yuv420p[v]',
  ];

  if (hasAudio) {
    const handles = kept.map((_, index) => `[as${index}]`).join('');
    const split = kept.length > 1 ? `asplit=${kept.length}${handles}` : 'anull[as0]';
    filters.push(
      '[0:a:0]aresample=48000:async=1:first_pts=0,'
      + 'aformat=sample_fmts=fltp:channel_layouts=stereo,'
      + `apad=whole_len=${totalFrames * samplesPerFrame + 720},${split}`,
    );
    kept.forEach((segment, index) => {
      const start = Math.round(segment.start * fps) * samplesPerFrame;
      const end = Math.round(segment.end * fps) * samplesPerFrame
        + (index < kept.length - 1 ? 720 : 0);
      filters.push(`[as${index}]atrim=start_sample=${start}:end_sample=${end},`
        + `asetpts=PTS-STARTPTS[a${index}]`);
    });
    let previous = 'a0';
    for (let index = 1; index < kept.length; index += 1) {
      const next = `ax${index}`;
      filters.push(`[${previous}][a${index}]acrossfade=ns=720:c1=tri:c2=tri[${next}]`);
      previous = next;
    }
    filters.push(`[${previous}]atrim=end_sample=${outputSamples},asetpts=PTS-STARTPTS[a]`);
  }

  const args = [
    '-i', inputName, '-filter_complex', filters.join(';'), '-map', '[v]',
  ];
  if (hasAudio) args.push('-map', '[a]');
  args.push(
    '-sn', '-dn', '-map_metadata', '-1',
    '-r', String(fps), '-frames:v', String(outputFrames),
    '-t', (outputFrames / fps).toFixed(9),
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18', '-preset', 'fast',
    '-pix_fmt', 'yuv420p', '-threads', '1',
  );
  if (hasAudio) args.push('-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2');
  else args.push('-an');
  args.push('-movflags', '+faststart', outputName);
  return args;
}
