import { exportVideo as renderVideo } from './exporter.js';
import { normalizeCuts, getKeptSegments } from './cuts.js';

const $ = (id) => document.getElementById(id);
const video = $('video');

const MESSAGES = {
  "limitCuts": [
    "الحد الأقصى 100 جزء في المرة الواحدة. جرّب تدمج الأجزاء القريبة من بعض.",
    "Keep the edit to 100 sections or fewer. Try combining nearby sections."
  ],
  "keepSection": [
    "لازم تسيب جزء من الفيديو. ما ينفعش تشيله كله.",
    "Keep at least one section of the video. You cannot remove it all."
  ],
  "browserNotReady": [
    "المتصفح مش جاهز للتصدير. حدّث الصفحة، ولو المشكلة مستمرة جرّب Chrome أو Edge محدث.",
    "Your browser is not ready to export. Refresh the page, or try an up-to-date Chrome or Edge."
  ],
  "engineNetwork": [
    "أدوات القص ما اتحمّلتش. اتأكد من اتصال الإنترنت وجرّب تاني. الفيديو نفسه بيفضل على جهازك.",
    "The editing engine could not load. Check your internet connection and try again. Your video stays on your device."
  ],
  "outOfMemory": [
    "ذاكرة المتصفح مش مكفية للفيديو ده. اقفل التابات التقيلة أو جرّب ملف أصغر.",
    "The browser ran out of memory. Close other heavy tabs or try a smaller video."
  ],
  "invalidTimes": [
    "راجع وقت البداية والنهاية. لازم النهاية تكون بعد البداية وجوه مدة الفيديو.",
    "Check the start and end times. The end must follow the start and stay within the video."
  ],
  "unsupportedCodec": [
    "صيغة الفيديو أو الكوديك مش مدعومين هنا. جرّب نسخة MP4 بكوديك H.264 وصوت AAC.",
    "This video format or codec is unsupported. Try an MP4 with H.264 video and AAC audio."
  ],
  "exportFailed": [
    "التصدير ما كملش. جرّب تاني أو استخدم فيديو MP4 أصغر. قصّاتك لسه موجودة وملفك الأصلي زي ما هو.",
    "Export did not finish. Try again or use a smaller MP4. Your cuts and original file are unchanged."
  ],
  "actionFailed": [
    "الخطوة دي ما كملتش. راجع الجزء المحدد وجرّب تاني.",
    "This action could not be completed. Check the marked section and try again."
  ],
  "loadingEngine": [
    "بنجهز أدوات القص… أول مرة ممكن تاخد شوية وقت.",
    "Loading the editing engine… The first time may take a moment."
  ],
  "readingVideo": [
    "بنقرأ الفيديو على جهازك…",
    "Reading your video on this device…"
  ],
  "exportNoAudio": [
    "بنصدّر القصّات… الفيديو ده مفيهوش مسار صوت.",
    "Exporting your cuts… This video has no audio track."
  ],
  "exportingVideo": [
    "بنحفظ الفيديو الجديد… سيب الصفحة مفتوحة.",
    "Saving your new video… Keep this page open."
  ],
  "checkingVideo": [
    "بنراجع ملف الفيديو الجديد…",
    "Checking your new video…"
  ],
  "videoReady": [
    "الفيديو الجديد جاهز.",
    "Your new video is ready."
  ],
  "preparingVideo": [
    "بنجهز الفيديو…",
    "Preparing your video…"
  ],
  "oldCutsVersion": [
    "في قصّات محفوظة بإصدار مختلف. ما غيّرناهاش؛ تقدر تبدأ قصّات جديدة هنا.",
    "Saved cuts use a different version. They were left unchanged. You can start a new edit here."
  ],
  "restoredCutsNotice": [
    "رجّعنا القصّات المحفوظة للفيديو ده. تقدر تكمل من مكانك.",
    "Your saved cuts for this video are restored. You can continue editing."
  ],
  "restoreCutsFailed": [
    "ما قدرناش نقرأ القصّات القديمة. الفيديو جاهز، وتقدر تبدأ قصّات جديدة.",
    "Previous cuts could not be read. Your video is ready for a new edit."
  ],
  "cutsSaved": [
    "مواعيد القص محفوظة في المتصفح.",
    "Cut times are saved in this browser."
  ],
  "storageUnavailable": [
    "المتصفح ما قدرش يحفظ المواعيد. خليك فاتح الصفحة لحد التصدير.",
    "Your browser could not save cut times. Keep this page open until you export."
  ],
  "selectionSeconds": [
    "{seconds} ثانية متحددة",
    "{seconds} seconds marked"
  ],
  "markTimes": [
    "علّم البداية والنهاية أو اكتب الوقت.",
    "Mark a start and end, or type exact times."
  ],
  "chooseAndMark": [
    "اختار فيديو، وبعدها علّم البداية والنهاية.",
    "Choose a video, then mark a start and end."
  ],
  "savingVideo": [
    "جاري حفظ الفيديو…",
    "Saving your video…"
  ],
  "saveVideo": [
    "احفظ الفيديو الجديد",
    "Save new video"
  ],
  "noCuts": [
    "لسه مفيش قصّات",
    "No cuts yet"
  ],
  "cutsExplanation": [
    "كل جزء تشيله هيظهر هنا. تقدر ترجّعه في أي وقت.",
    "Sections you remove appear here. You can restore them at any time."
  ],
  "removedSeconds": [
    "{seconds} ثانية هتتشال",
    "{seconds} seconds removed"
  ],
  "restore": [
    "رجّع",
    "Restore"
  ],
  "restoreAria": [
    "رجّع الجزء من {start} لحد {end}",
    "Restore section from {start} to {end}"
  ],
  "waitExport": [
    "استنى التصدير يخلص أو الغيه الأول، وبعدها غيّر الفيديو.",
    "Wait for export to finish, or cancel it before choosing another video."
  ],
  "emptyFile": [
    "الملف ده فاضي. اختار فيديو فيه محتوى.",
    "This file is empty. Choose a video with content."
  ],
  "fileTooLarge": [
    "الفيديو أكبر من الحد المسموح: 500 ميجابايت (MiB). جرّب نسخة أصغر عشان ذاكرة المتصفح تكفي.",
    "This video exceeds the 500 MiB limit. Try a smaller copy to fit browser memory."
  ],
  "chooseVideoFile": [
    "اختار ملف فيديو، زي MP4 أو MOV أو WebM.",
    "Choose a video file, such as MP4, MOV, or WebM."
  ],
  "invalidDuration": [
    "مدة الفيديو مش واضحة أو قصيرة جدًا. جرّب ملف فيديو عادي بصيغة MP4.",
    "The video duration is unavailable or too short. Try a standard MP4 video."
  ],
  "chooseAnother": [
    "اختار فيديو تاني.",
    "Choose another video."
  ],
  "cutsRestored": [
    "القصّات المحفوظة رجعت.",
    "Your saved cuts are restored."
  ],
  "readyToMark": [
    "ملفك جاهز. علّم أول جزء عايز تشيله.",
    "Your video is ready. Mark the first section to remove."
  ],
  "cannotPlay": [
    "المتصفح مش قادر يشغّل الفيديو ده. جرّب نسخة MP4 بكوديك H.264 وصوت AAC.",
    "Your browser cannot play this video. Try an MP4 with H.264 video and AAC audio."
  ],
  "changeVideoHelp": [
    "اختار فيديو تاني من زر «غيّر الفيديو».",
    "Use Change video to choose another file."
  ],
  "oneVideo": [
    "اختار فيديو واحد كل مرة.",
    "Choose one video at a time."
  ],
  "preparingEngine": [
    "بنجهز أدوات القص…",
    "Preparing the editing engine…"
  ],
  "downloadReady": [
    "الفيديو الجديد جاهز. نزّله من الزر اللي تحت.",
    "Your new video is ready. Download it below."
  ],
  "exportComplete": [
    "التصدير خلص. ملفك الأصلي لسه زي ما هو.",
    "Export complete. Your original file stays unchanged."
  ],
  "exportCancelled": [
    "التصدير اتلغى. قصّاتك لسه محفوظة.",
    "Export cancelled. Your cuts are still saved."
  ],
  "exportIncomplete": [
    "التصدير ما كملش.",
    "Export did not finish."
  ],
  "cancellingExport": [
    "بنلغي التصدير…",
    "Cancelling export…"
  ],
  "playHelp": [
    "اضغط تشغيل على الفيديو عشان تبدأ المعاينة.",
    "Press Play on the video to begin previewing."
  ],
  "chooseToBegin": [
    "اختار فيديو عشان تبدأ.",
    "Choose a video to begin."
  ],
  "switchLanguage": [
    "التغيير للغة الإنجليزية",
    "Switch language to Arabic"
  ]
};
const STATIC_TRANSLATIONS = {
  "قص الفيديو بنفسك من المتصفح، واحفظ نسخة جديدة. الفيديو بيفضل على جهازك.": "Cut videos in your browser and save a new copy. Your video stays on your device.",
  "Video Editer — قص الفيديو بنفسك": "Video Editer — Cut your video, your way",
  "قص وتصدير على جهازك": "Edit on your device",
  "الفيديو وأدوات القص": "Video and cutting controls",
  "إنت اللي تختار كل لقطة": "Every frame is your choice",
  "قص الفيديو على مزاجك.": "Cut your video, your way.",
  "علّم البداية والنهاية، شيل الجزء، واحفظ نسخة جديدة.": "Mark a start and end, remove the section, and save a new copy.",
  "غيّر الفيديو": "Change video",
  "معاينة الفيديو": "Video preview",
  "ابدأ بالفيديو بتاعك": "Start with your video",
  "اسحبه هنا أو اختاره من جهازك.": "Drop it here or choose a file from your device.",
  "اختار فيديو": "Choose video",
  "MP4، MOV، WebM وأي فيديو يقدر المتصفح يشغّله": "MP4, MOV, WebM, and other browser-playable videos",
  "أقصى حجم: 500 ميجابايت (MiB)": "Maximum size: 500 MiB",
  "سيب الفيديو هنا": "Drop your video here",
  "اختار ملف فيديو": "Choose a video file",
  "ارجع 5 ثواني": "Back 5 seconds",
  "−5 ث": "−5 sec",
  "الفريم اللي قبله — السهم الشمال": "Previous frame — left arrow",
  "← فريم": "← frame",
  "الفريم اللي بعده — السهم اليمين": "Next frame — right arrow",
  "فريم →": "frame →",
  "اتقدم 5 ثواني": "Forward 5 seconds",
  "+5 ث": "+5 sec",
  "مكان التشغيل في الفيديو": "Video playback position",
  "الأحمر: الأجزاء اللي هتتشال": "Red sections will be removed",
  "الأوقات على الفيديو اللي اخترته": "Times refer to your selected video",
  "عدّي الأجزاء المحذوفة أثناء المعاينة": "Skip removed sections during preview",
  "ارجع للأول": "Go to start",
  "علّم الجزء اللي عايز تشيله": "Mark a section to remove",
  "البداية": "Start time",
  "علّم البداية": "Mark start",
  "وقت بداية الجزء اللي هيتشال": "Start of the section to remove",
  "النهاية": "End time",
  "علّم النهاية": "Mark end",
  "وقت نهاية الجزء اللي هيتشال": "End of the section to remove",
  "اختار فيديو، وبعدها علّم البداية والنهاية.": "Choose a video, then mark a start and end.",
  "شيل الجزء المحدد": "Remove marked section",
  "تشغيل/إيقاف": "play/pause",
  "بداية": "start",
  "نهاية": "end",
  "فريم": "frame",
  "حذف": "remove",
  "الفيديو بيفضل على جهازك؛ القص والتصدير جوه المتصفح.": "Your video stays on your device. Cutting and export happen in your browser.",
  "الأجزاء المحذوفة وحفظ الفيديو": "Removed sections and export",
  "الأجزاء اللي هتتشال": "Removed sections",
  "لسه مفيش قصّات": "No cuts yet",
  "كل جزء تشيله هيظهر هنا.": "Sections you remove appear here.",
  "تقدر ترجّعه في أي وقت.": "You can restore them at any time.",
  "↶ تراجع": "↶ Undo",
  "رجّع الكل": "Restore all",
  "مدة الفيديو": "Original duration",
  "اللي هيتشال": "Removed",
  "بعد القص": "After cutting",
  "احفظ الفيديو الجديد": "Save new video",
  "اختار فيديو عشان تبدأ.": "Choose a video to begin.",
  "تقدم تصدير الفيديو": "Video export progress",
  "إلغاء التصدير": "Cancel export",
  "نزّل الفيديو الجديد": "Download new video",
  "ملفك الأصلي هيفضل زي ما هو. بنحفظ مواعيد القص بس في المتصفح؛ لو رجعت للموقع، اختار نفس الفيديو عشان ترجع قصّاتك.": "Your original file stays unchanged. Only cut times are saved in this browser. Choose the same video when you return to restore your cuts.",
  "أول تصدير بيحمّل أدوات القص (حوالي 32 ميجابايت).": "The first export downloads the editing engine (about 32 MB).",
  "كل لقطة بإيدك.": "Every frame is yours."
};
let language = 'ar';
try { const saved = localStorage.getItem('video-editer:language'); if (saved === 'ar' || saved === 'en') language = saved; } catch { /* Language works even when storage is unavailable. */ }
let noticeState = null;
let saveStateKey = 'chooseToBegin';
let saveStateWarning = false;
let exportMessageState = null;
const staticTextRecords = [];
const staticAttributeRecords = [];

function t(key, args = {}) {
  const pair = MESSAGES[key];
  const text = pair ? pair[language === 'ar' ? 0 : 1] : String(key || '');
  return text.replace(/\{(\w+)\}/g, (match, name) => String(args[name] ?? match));
}

function captureStaticTranslations() {
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const value = node.textContent;
    const parts = value.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (!parts || !(parts[2] in STATIC_TRANSLATIONS)) continue;
    staticTextRecords.push({ node, before: parts[1], after: parts[3], ar: parts[2], en: STATIC_TRANSLATIONS[parts[2]] });
  }
  for (const element of document.querySelectorAll('[aria-label], [title], meta[name="description"]')) {
    for (const name of ['aria-label', 'title', 'content']) {
      const value = element.getAttribute(name);
      if (value && value in STATIC_TRANSLATIONS) staticAttributeRecords.push({ element, name, ar: value, en: STATIC_TRANSLATIONS[value] });
    }
  }
}

function renderSaveState() {
  $('saveState').textContent = t(saveStateKey);
  $('saveState').classList.toggle('warning', saveStateWarning);
}

function setSaveState(key, warning = false) {
  saveStateKey = key;
  saveStateWarning = warning;
  renderSaveState();
}

function renderExportMessage() {
  const state = exportMessageState;
  $('exportMessage').textContent = !state ? '' : state.engine ? exportMessage(state.value) : t(state.value);
}

function setExportMessage(key) {
  exportMessageState = key ? { value: key, engine: false } : null;
  renderExportMessage();
}

function setEngineMessage(message) {
  exportMessageState = { value: String(message || ''), engine: true };
  renderExportMessage();
}

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  for (const record of staticTextRecords) record.node.textContent = record.before + record[language] + record.after;
  for (const record of staticAttributeRecords) record.element.setAttribute(record.name, record[language]);
  $('languageToggle').textContent = language === 'ar' ? 'English' : 'العربية';
  $('languageToggle').lang = language === 'ar' ? 'en' : 'ar';
  $('languageToggle').setAttribute('aria-label', t('switchLanguage'));
  $('languageToggle').title = t('switchLanguage');
  render();
  renderSaveState();
  drawNotice();
  renderExportMessage();
}

$('languageToggle').addEventListener('click', () => {
  language = language === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('video-editer:language', language); } catch { /* The current language still changes. */ }
  applyLanguage();
});

const FPS = 30;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const STORAGE_VERSION = 1;
const playbackControls = ['backFive', 'backFrame', 'nextFrame', 'nextFive', 'markStart', 'markEnd', 'jumpStart'];
let file = null;
let videoUrl = null;
let downloadUrl = null;
let sourceDuration = 0;
let cuts = [];
let undoStack = [];
let marks = { start: 0, end: 0 };
let storageKey = null;
let loaded = false;
let busy = false;
let controller = null;
let exportGeneration = 0;
let dragDepth = 0;
let animationFrame = null;

const clamp = (time) => Math.max(0, Math.min(sourceDuration, time));
const snap = (time) => clamp(Math.round(time * FPS) / FPS);
const cloneCuts = (list) => list.map(({ start, end }) => ({ start, end }));

function formatTime(value) {
  let ms = Math.max(0, Math.round((Number(value) || 0) * 1000));
  const hours = Math.floor(ms / 3600000);
  ms %= 3600000;
  const minutes = Math.floor(ms / 60000);
  ms %= 60000;
  const seconds = Math.floor(ms / 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

function shortTime(value) {
  const seconds = Math.max(0, Math.round(Number(value) || 0));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function parseTime(raw) {
  const text = raw.trim().replace(/٫/g, '.').replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  if (!/^(?:\d+:){0,2}\d+(?:\.\d{1,6})?$/.test(text)) return NaN;
  const parts = text.split(':').map(Number);
  if (parts.length > 1 && parts.at(-1) >= 60) return NaN;
  if (parts.length === 3 && parts[1] >= 60) return NaN;
  return parts.reduce((total, value) => total * 60 + value, 0);
}

function notify(key = '', info = false, args = {}) {
  noticeState = key ? { key, info, args } : null;
  drawNotice();
}

function drawNotice() {
  $('notice').textContent = noticeState ? t(noticeState.key, noticeState.args) : '';
  $('notice').className = `notice${noticeState?.info ? ' info' : ''}${noticeState ? '' : ' hidden'}`;
}

function friendlyError(error, exporting = false) {
  const message = String(error?.message || error || '');
  if (/100|too many.*cut|maximum.*cut/i.test(message)) return 'limitCuts';
  if (/entire|all.*remov|nothing.*keep|no.*segment|whole.*video|full.*video/i.test(message)) return 'keepSection';
  if (/SharedArrayBuffer|cross.?origin|isolat/i.test(message)) return 'browserNotReady';
  if (/fetch|network|download|load.*ffmpeg|load.*wasm|load.*core|failed to import/i.test(message)) return 'engineNetwork';
  if (/memory|alloc|out of bounds|too large|500/i.test(message)) return 'outOfMemory';
  if (/duration|finite|invalid.*time|start.*end|out.*range|valid.*cut/i.test(message)) return 'invalidTimes';
  if (/codec|decoder|unsupported|invalid data|unknown format|not supported|cannot.*decode|could.*decode/i.test(message)) return 'unsupportedCodec';
  if (exporting) return 'exportFailed';
  return 'actionFailed';
}

function exportMessage(message) {
  const text = String(message || '');
  if (language === 'en') return text || t('preparingVideo');
  if (/ready|finished/i.test(text)) return t('videoReady');
  if (/load/i.test(text)) return t('loadingEngine');
  if (/read/i.test(text)) return t('readingVideo');
  if (/no audio/i.test(text)) return t('exportNoAudio');
  if (/export/i.test(text)) return t('exportingVideo');
  if (/check/i.test(text)) return t('checkingVideo');
  return t('preparingVideo');
}

function savedKey(selectedFile) {
  return `framecut:cuts:v${STORAGE_VERSION}:${JSON.stringify([selectedFile.name, selectedFile.size, selectedFile.lastModified])}`;
}

function readSavedCuts() {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.version !== STORAGE_VERSION || !Array.isArray(data.cuts)) {
      notify('oldCutsVersion', true);
      return [];
    }
    const restored = normalizeCuts(data.cuts, sourceDuration, FPS);
    if (!getKeptSegments(restored, sourceDuration, FPS).length) throw new Error('Whole video removed');
    if (restored.length) notify('restoredCutsNotice', true);
    return restored;
  } catch {
    notify('restoreCutsFailed', true);
    return [];
  }
}

function saveCuts() {
  if (!storageKey || !file || !loaded) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({
      version: STORAGE_VERSION,
      fps: FPS,
      cuts,
      video: { name: file.name, size: file.size, lastModified: file.lastModified },
      savedAt: new Date().toISOString(),
    }));
    setSaveState('cutsSaved');
    $('saveState').classList.remove('warning');
  } catch {
    setSaveState('storageUnavailable', true);
    $('saveState').classList.add('warning');
  }
}

function clearDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
  downloadUrl = null;
  $('downloadVideo').removeAttribute('href');
  $('downloadVideo').classList.add('hidden');
}

function resetExportPanel() {
  clearDownload();
  $('exportPanel').classList.add('hidden');
  $('exportProgress').value = 0;
  $('exportPercent').textContent = '';
  setExportMessage(null);
}

function remainingDuration() {
  if (!loaded) return 0;
  try {
    return getKeptSegments(cuts, sourceDuration, FPS).reduce((sum, segment) => sum + segment.end - segment.start, 0);
  } catch {
    return 0;
  }
}

function selectionValid() {
  return loaded && Number.isFinite(marks.start) && Number.isFinite(marks.end)
    && marks.start >= 0 && marks.end <= sourceDuration + 0.000001
    && snap(marks.end) - snap(marks.start) >= 1 / FPS - 0.000001;
}

function updateSelection() {
  const valid = selectionValid();
  $('selectionBand').classList.toggle('hidden', !valid);
  if (valid) {
    $('selectionBand').style.left = `${marks.start / sourceDuration * 100}%`;
    $('selectionBand').style.width = `${(marks.end - marks.start) / sourceDuration * 100}%`;
  }
  $('selectionDuration').textContent = valid
    ? t('selectionSeconds', { seconds: (snap(marks.end) - snap(marks.start)).toFixed(3) })
    : loaded ? t('markTimes') : t('chooseAndMark');
  $('removeSelection').disabled = !valid || busy;
}

function setMarkInputs() {
  $('startInput').value = formatTime(marks.start);
  $('endInput').value = formatTime(marks.end);
  $('startInput').setAttribute('aria-invalid', 'false');
  $('endInput').setAttribute('aria-invalid', 'false');
  updateSelection();
}

function readMarks() {
  marks = { start: parseTime($('startInput').value), end: parseTime($('endInput').value) };
  for (const [key, id] of [['start', 'startInput'], ['end', 'endInput']]) {
    const time = marks[key];
    $(id).setAttribute('aria-invalid', String(!Number.isFinite(time) || time < 0 || time > sourceDuration));
  }
  updateSelection();
}

function render() {
  const removed = cuts.reduce((sum, cut) => sum + cut.end - cut.start, 0);
  $('cutCount').textContent = String(cuts.length);
  $('originalDuration').textContent = loaded ? shortTime(sourceDuration) : '—';
  $('removedDuration').textContent = shortTime(removed);
  $('remainingDuration').textContent = loaded ? shortTime(remainingDuration()) : '—';
  $('undo').disabled = !undoStack.length || busy;
  $('clearCuts').disabled = !cuts.length || busy;
  $('exportVideo').disabled = !loaded || !cuts.length || busy || remainingDuration() < 1 / FPS - 0.000001;
  $('exportVideo').textContent = busy ? t('savingVideo') : t('saveVideo');
  $('changeVideo').disabled = busy;
  $('chooseVideo').disabled = busy;
  $('fileInput').disabled = busy;
  for (const id of playbackControls) $(id).disabled = !loaded;
  $('startInput').disabled = !loaded || busy;
  $('endInput').disabled = !loaded || busy;
  $('markStart').disabled = !loaded || busy;
  $('markEnd').disabled = !loaded || busy;
  const list = $('cutList');
  list.replaceChildren();
  if (!cuts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-cuts';
    const icon = document.createElement('div'); icon.textContent = '✂'; icon.setAttribute('aria-hidden', 'true');
    const strong = document.createElement('strong'); strong.textContent = t('noCuts');
    const explanation = document.createElement('p'); explanation.textContent = t('cutsExplanation');
    empty.append(icon, strong, explanation); list.append(empty);
  }
  cuts.forEach((cut, index) => {
    const row = document.createElement('div'); row.className = 'cut-row';
    const details = document.createElement('div');
    const time = document.createElement('span'); time.className = 'cut-time'; time.dir = 'ltr';
    time.textContent = `${formatTime(cut.start)} → ${formatTime(cut.end)}`;
    const length = document.createElement('div'); length.className = 'cut-duration'; length.textContent = t('removedSeconds', { seconds: (cut.end - cut.start).toFixed(3) });
    const restore = document.createElement('button'); restore.type = 'button'; restore.className = 'button quiet small'; restore.textContent = t('restore'); restore.disabled = busy;
    restore.setAttribute('aria-label', t('restoreAria', { start: formatTime(cut.start), end: formatTime(cut.end) }));
    restore.addEventListener('click', () => changeCuts(cuts.filter((_, rowIndex) => rowIndex !== index)));
    details.append(time, length); row.append(details, restore); list.append(row);
  });
  const bands = $('cutBands'); bands.replaceChildren();
  for (const cut of cuts) {
    const band = document.createElement('div'); band.className = 'removed-band';
    band.style.left = `${cut.start / sourceDuration * 100}%`;
    band.style.width = `${(cut.end - cut.start) / sourceDuration * 100}%`;
    bands.append(band);
  }
  updateSelection();
}

function changeCuts(nextCuts, remember = true) {
  if (!loaded || busy) return false;
  let canonical;
  try {
    canonical = normalizeCuts(nextCuts, sourceDuration, FPS);
    if (!getKeptSegments(canonical, sourceDuration, FPS).length) throw new Error('These cuts remove the whole video.');
  }
  catch (error) { notify(friendlyError(error)); return false; }
  if (JSON.stringify(canonical) === JSON.stringify(cuts)) return false;
  if (remember) undoStack.push(cloneCuts(cuts));
  cuts = canonical;
  resetExportPanel();
  notify();
  saveCuts();
  render();
  return true;
}

function undo() {
  if (!undoStack.length || busy) return;
  const previous = undoStack[undoStack.length - 1];
  if (changeCuts(previous, false)) undoStack.pop();
  render();
}

function updatePlayhead() {
  const current = Number(video.currentTime) || 0;
  $('currentTime').textContent = formatTime(current);
  $('playhead').style.left = `${sourceDuration ? Math.min(100, current / sourceDuration * 100) : 0}%`;
  $('timeline').setAttribute('aria-valuenow', String(current));
  $('timeline').setAttribute('aria-valuetext', formatTime(current));
}

function seek(time) {
  if (!loaded || !Number.isFinite(time)) return;
  video.currentTime = clamp(time);
  updatePlayhead();
}

function step(amount) {
  if (!loaded) return;
  video.pause();
  seek(video.currentTime + amount);
}

function playbackTick() {
  if (!loaded || video.paused) { animationFrame = null; return; }
  if ($('skipCuts').checked) {
    const current = video.currentTime;
    const cut = cuts.find((range) => current >= range.start - 0.005 && current < range.end - 0.005);
    if (cut) {
      video.currentTime = clamp(cut.end);
      if (cut.end >= sourceDuration - 0.005) video.pause();
    }
  }
  updatePlayhead();
  animationFrame = requestAnimationFrame(playbackTick);
}

function loadFile(selectedFile) {
  if (!selectedFile) return;
  if (busy) { notify('waitExport'); return; }
  if (selectedFile.size === 0) { notify('emptyFile'); return; }
  if (selectedFile.size > MAX_FILE_SIZE) { notify('fileTooLarge'); return; }
  if (!selectedFile.type.startsWith('video/') && !/\.(mp4|mov|webm|m4v)$/i.test(selectedFile.name)) {
    notify('chooseVideoFile'); return;
  }
  video.pause();
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  video.removeAttribute('src');
  video.load();
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  resetExportPanel();
  file = selectedFile;
  sourceDuration = 0;
  cuts = [];
  undoStack = [];
  marks = { start: 0, end: 0 };
  loaded = false;
  storageKey = savedKey(file);
  $('videoName').textContent = file.name;
  $('fileSize').textContent = `${(file.size / 1024 / 1024).toFixed(1)} MiB`;
  $('videoNameRow').classList.remove('hidden');
  $('emptyPlayer').classList.add('hidden');
  $('video').classList.remove('hidden');
  $('changeVideo').classList.remove('hidden');
  setSaveState('preparingVideo');
  $('saveState').classList.remove('warning');
  $('totalTime').textContent = '—';
  $('timeline').setAttribute('aria-disabled', 'true');
  $('timeline').setAttribute('aria-valuemax', '0');
  notify();
  setMarkInputs(); render(); updatePlayhead();
  videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;
  video.load();
}

video.addEventListener('loadedmetadata', () => {
  if (!file || !videoUrl || video.currentSrc !== videoUrl) return;
  if (!Number.isFinite(video.duration) || video.duration < 1 / FPS) {
    loaded = false;
    notify('invalidDuration');
    setSaveState('chooseAnother');
    render(); return;
  }
  sourceDuration = video.duration;
  loaded = true;
  cuts = readSavedCuts();
  $('totalTime').textContent = formatTime(sourceDuration);
  $('timeline').setAttribute('aria-disabled', 'false');
  $('timeline').setAttribute('aria-valuemax', String(sourceDuration));
  setSaveState(cuts.length ? 'cutsRestored' : 'readyToMark');
  setMarkInputs(); render(); updatePlayhead();
});

video.addEventListener('error', () => {
  if (!file || !videoUrl || video.currentSrc !== videoUrl) return;
  loaded = false;
  notify('cannotPlay');
  setSaveState('changeVideoHelp');
  render();
});
video.addEventListener('timeupdate', updatePlayhead);
video.addEventListener('seeked', updatePlayhead);
video.addEventListener('play', () => { if (!animationFrame) animationFrame = requestAnimationFrame(playbackTick); });
video.addEventListener('pause', updatePlayhead);

for (const id of ['chooseVideo', 'changeVideo']) $(id).addEventListener('click', () => { if (!busy) $('fileInput').click(); });
$('fileInput').addEventListener('change', (event) => {
  const selected = event.target.files?.[0];
  loadFile(selected);
  event.target.value = '';
});
function isFileDrag(event) { return [...(event.dataTransfer?.types || [])].includes('Files'); }
document.addEventListener('dragenter', (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault(); dragDepth += 1;
  if (!busy) $('dropOverlay').classList.remove('hidden');
});
document.addEventListener('dragover', (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy';
});
document.addEventListener('dragleave', (event) => {
  if (!isFileDrag(event)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('dropOverlay').classList.add('hidden');
});
document.addEventListener('drop', (event) => {
  if (!isFileDrag(event)) return;
  event.preventDefault(); dragDepth = 0; $('dropOverlay').classList.add('hidden');
  const selected = [...(event.dataTransfer.files || [])];
  if (selected.length !== 1) { notify('oneVideo'); return; }
  loadFile(selected[0]);
});
window.addEventListener('blur', () => { dragDepth = 0; $('dropOverlay').classList.add('hidden'); });

$('backFive').addEventListener('click', () => step(-5));
$('nextFive').addEventListener('click', () => step(5));
$('backFrame').addEventListener('click', () => step(-1 / FPS));
$('nextFrame').addEventListener('click', () => step(1 / FPS));
$('jumpStart').addEventListener('click', () => { video.pause(); seek(0); });
$('markStart').addEventListener('click', () => { if (!loaded || busy) return; marks.start = snap(video.currentTime); setMarkInputs(); });
$('markEnd').addEventListener('click', () => { if (!loaded || busy) return; marks.end = snap(video.currentTime); setMarkInputs(); });
for (const id of ['startInput', 'endInput']) {
  $(id).addEventListener('input', readMarks);
  $(id).addEventListener('blur', () => {
    readMarks();
    if (Number.isFinite(marks.start) && Number.isFinite(marks.end) && marks.start >= 0 && marks.start <= sourceDuration && marks.end >= 0 && marks.end <= sourceDuration) {
      marks = { start: snap(marks.start), end: snap(marks.end) }; setMarkInputs();
    }
  });
}
$('removeSelection').addEventListener('click', () => {
  readMarks();
  if (!selectionValid() || busy) return;
  const start = snap(marks.start), end = snap(marks.end);
  if (changeCuts([...cuts, { start, end }])) { marks = { start: end, end }; setMarkInputs(); }
});
$('undo').addEventListener('click', undo);
$('clearCuts').addEventListener('click', () => { if (cuts.length) changeCuts([]); });
$('timeline').addEventListener('click', (event) => {
  if (!loaded) return;
  const rect = $('timeline').getBoundingClientRect();
  seek((event.clientX - rect.left) / rect.width * sourceDuration);
});

$('exportVideo').addEventListener('click', async () => {
  if (!loaded || !file || !cuts.length || busy) return;
  video.pause(); saveCuts(); notify(); resetExportPanel();
  const exportFile = file, exportCuts = cloneCuts(cuts), exportDuration = sourceDuration;
  const generation = ++exportGeneration;
  controller = new AbortController();
  const signal = controller.signal;
  busy = true; render();
  $('exportPanel').classList.remove('hidden');
  $('exportProgress').classList.remove('hidden');
  $('cancelExport').classList.remove('hidden');
  setExportMessage('preparingEngine');
  $('exportPercent').textContent = '0%';
  try {
    const result = await renderVideo({
      file: exportFile,
      duration: exportDuration,
      cuts: exportCuts,
      signal,
      onProgress(progress) {
        if (generation !== exportGeneration || signal.aborted) return;
        const value = Math.max(0, Math.min(1, Number(progress) || 0));
        $('exportProgress').value = value;
        $('exportPercent').textContent = `${Math.round(value * 100)}%`;
      },
      onMessage(message) {
        if (generation !== exportGeneration || signal.aborted) return;
        setEngineMessage(message);
      },
    });
    if (signal.aborted) return;
    if (!(result?.blob instanceof Blob) || !result.blob.size) throw new Error('Empty exported video');
    downloadUrl = URL.createObjectURL(result.blob);
    const filename = typeof result.filename === 'string' ? result.filename.replace(/[\\/\u0000-\u001f]/g, '_') : `${exportFile.name.replace(/\.[^.]+$/, '')}_cut.mp4`;
    $('downloadVideo').href = downloadUrl;
    $('downloadVideo').download = filename;
    $('downloadVideo').classList.remove('hidden');
    $('exportProgress').value = 1;
    $('exportPercent').textContent = '100%';
    setExportMessage('downloadReady');
    setSaveState('exportComplete');
  } catch (error) {
    const cancelled = signal.aborted || error?.name === 'AbortError';
    setExportMessage(cancelled ? 'exportCancelled' : 'exportIncomplete');
    $('exportPercent').textContent = '';
    $('exportProgress').classList.add('hidden');
    if (!cancelled) notify(friendlyError(error, true));
  } finally {
    busy = false; controller = null;
    $('cancelExport').classList.add('hidden');
    render();
  }
});
$('cancelExport').addEventListener('click', () => {
  if (!controller || !busy) return;
  $('cancelExport').disabled = true;
  setExportMessage('cancellingExport');
  controller.abort();
  // A fresh export gets a fresh AbortController.
  $('cancelExport').disabled = false;
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
  const key = event.key.toLowerCase();
  if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); return; }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.code === 'Space' && target.tagName !== 'BUTTON') {
    event.preventDefault();
    if (loaded) { if (video.paused) video.play().catch(() => notify('playHelp')); else video.pause(); }
  } else if (key === 'i' && loaded && !busy) { event.preventDefault(); $('markStart').click(); }
  else if (key === 'o' && loaded && !busy) { event.preventDefault(); $('markEnd').click(); }
  else if (key === 'arrowleft' && loaded) { event.preventDefault(); step(-1 / FPS); }
  else if (key === 'arrowright' && loaded) { event.preventDefault(); step(1 / FPS); }
  else if ((key === 'delete' || key === 'backspace') && loaded && !busy) { event.preventDefault(); if (!$('removeSelection').disabled) $('removeSelection').click(); }
});
window.addEventListener('beforeunload', (event) => {
  if (busy) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', (event) => {
  if (event.persisted) return;
  if (videoUrl) URL.revokeObjectURL(videoUrl);
  if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});

captureStaticTranslations();
applyLanguage();
