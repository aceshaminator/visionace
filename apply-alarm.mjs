// Adds the Alarm watch card to src/TranscriptTest.tsx. Run from the motion folder: node apply-alarm.mjs
import fs from 'node:fs';

const file = 'src/TranscriptTest.tsx';
if (!fs.existsSync(file)) {
  console.error('Could not find src/TranscriptTest.tsx. Open a terminal in the motion folder (the one that contains src) and run this again.');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');

if (t.includes('AlarmWatch')) {
  console.log('Already applied. Nothing changed.');
  process.exit(0);
}
const fail = (what) => {
  console.error(`Could not find the place to change: ${what}. Nothing was changed. Send me this message.`);
  process.exit(1);
};

// 1. the import: after the last of the lines we know about
const anchors = [
  /^import FingerSpell from '\.\/FingerSpell';[ \t]*$/m,
  /^import VoiceNoteImport from '\.\/VoiceNoteImport';[ \t]*$/m,
  /^import \{ estimatePitch, guessVoice \} from '\.\/pitch';[ \t]*$/m,
];
const hit = anchors.find((re) => re.test(t));
if (!hit) fail('the import line');
t = t.replace(hit, (m) => `${m}\nimport AlarmWatch from './AlarmWatch';`);

// 2. the card, placed before the mode screens so it shows on every tab
const marker = /^([ \t]*)\{\/\* ACTIVE MODES \*\/\}[ \t]*$/m;
if (!marker.test(t)) fail('the place before the mode screens');
t = t.replace(marker, (m, indent) => `${indent}<AlarmWatch />\n\n${m}`);

fs.writeFileSync(file + '.bak-alarm', raw);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Done. A copy of your old file was saved as src/TranscriptTest.tsx.bak-alarm');
