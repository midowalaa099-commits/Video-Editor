import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildExportArgs, getKeptSegments, normalizeCuts } from '../src/cuts.js';

test('cuts are clamped, frame-snapped, sorted, merged and idempotent', () => {
  const input = [{ start: 2, end: 3 }, { start: -.1, end: .3333333333 },
    { start: 3, end: 9 }, { start: 2.5, end: 3.5 }];
  const actual = normalizeCuts(input, 5);
  assert.deepEqual(actual, [{ start: 0, end: 1 / 3 }, { start: 2, end: 5 }]);
  assert.deepEqual(normalizeCuts(actual, 5), actual);
  assert.deepEqual(input[0], { start: 2, end: 3 });
});

test('kept segments preserve chronology and exclude the last partial frame', () => {
  assert.deepEqual(getKeptSegments([[.5, 1], [1.5, 2]], 3.019), [
    { start: 0, end: .5 }, { start: 1, end: 1.5 }, { start: 2, end: 3 },
  ]);
  assert.deepEqual(getKeptSegments([], 1.01), [{ start: 0, end: 1 }]);
  assert.deepEqual(getKeptSegments([[0, 1]], 1), []);
});

test('invalid durations, ranges, too many cuts and all-removed exports are rejected', () => {
  assert.throws(() => normalizeCuts([], Infinity));
  assert.throws(() => normalizeCuts([], .001));
  assert.throws(() => normalizeCuts([{ start: NaN, end: 1 }], 2));
  assert.throws(() => normalizeCuts([[1, 0]], 2));
  assert.throws(() => normalizeCuts(Array.from({ length: 101 }, () => [0, 1]), 2));
  assert.throws(() => buildExportArgs({ duration: 2, cuts: [[0, 2]] }), /whole video/);
});

test('audio filter preserves timeline length with 15ms outgoing handles', () => {
  const args = buildExportArgs({ duration: 3, cuts: [[.5, 1], [1.5, 2]] });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert.match(graph, /fps=fps=30:start_time=0/);
  assert.match(graph, /end_sample=24720/); // .5s plus 15ms handle
  assert.equal((graph.match(/acrossfade=ns=720/g) || []).length, 2);
  assert.match(graph, /atrim=end_sample=96000/); // 2.0 seconds kept
  assert.equal(args[args.indexOf('-frames:v') + 1], '60');
  assert.equal(args[args.indexOf('-c:v') + 1], 'libx264');
  assert.equal(args[args.indexOf('-profile:v') + 1], 'high');
  assert.equal(args[args.indexOf('-crf') + 1], '18');
  assert.equal(args[args.indexOf('-b:a') + 1], '192k');
  assert(!args.includes('copy'));
});

test('no-audio clips avoid nonexistent audio streams and preserve dimensions', () => {
  const args = buildExportArgs({ duration: 1, hasAudio: false });
  const graph = args[args.indexOf('-filter_complex') + 1];
  assert(!graph.includes('[0:a'));
  assert(args.includes('-an'));
  assert.match(graph, /pad=w=ceil\(iw\/2\)\*2:h=ceil\(ih\/2\)\*2/);
});

const native = process.env.VIDEO_CUTTER_NATIVE_TESTS === '1';
test('native FFmpeg executes the browser audio and silent export commands', { skip: !native }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'video-cutter-test-'));
  const run = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args],
    { encoding: 'utf8', timeout: 60000 });
  const inspect = (path) => JSON.parse(execFileSync('ffprobe', ['-v', 'error',
    '-show_streams', '-show_format', '-of', 'json', path], { encoding: 'utf8' }));
  try {
    const audioInput = join(directory, 'with-audio.mp4');
    const audioOutput = join(directory, 'with-audio-edited.mp4');
    run(['-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=24:duration=3',
      '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100:duration=3',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', audioInput]);
    run(buildExportArgs({ inputName: audioInput, outputName: audioOutput,
      duration: 3, cuts: [[.5, 1], [1.5, 2]], hasAudio: true }));
    const audioResult = inspect(audioOutput);
    const v = audioResult.streams.find((stream) => stream.codec_type === 'video');
    const a = audioResult.streams.find((stream) => stream.codec_type === 'audio');
    assert.equal(Number(v.nb_frames), 60);
    assert.equal(v.avg_frame_rate, '30/1');
    assert.equal(v.width, 320);
    assert.equal(v.height, 180);
    assert.equal(v.profile, 'High');
    assert.equal(a.sample_rate, '48000');
    assert.equal(a.channels, 2);
    assert(Math.abs(Number(v.duration) - Number(a.duration)) < .025);
    assert.equal(Number(v.duration), 2);

    const silentInput = join(directory, 'odd-dimensions.mkv');
    const silentOutput = join(directory, 'silent-edited.mp4');
    run(['-f', 'lavfi', '-i', 'testsrc=size=319x179:rate=30:duration=1',
      '-c:v', 'ffv1', '-pix_fmt', 'bgr0', silentInput]);
    run(buildExportArgs({ inputName: silentInput, outputName: silentOutput,
      duration: 1, cuts: [], hasAudio: false }));
    const silentResult = inspect(silentOutput);
    const silentVideo = silentResult.streams.find((stream) => stream.codec_type === 'video');
    assert.equal(silentResult.streams.length, 1);
    assert.equal(Number(silentVideo.nb_frames), 30);
    assert.equal(silentVideo.width, 320);
    assert.equal(silentVideo.height, 180);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
