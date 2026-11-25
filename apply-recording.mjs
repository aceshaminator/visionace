// Lets recordings show as "Recording" (not "Voice note") in the captions.
// Run from the motion folder: node apply-recording.mjs
import fs from 'node:fs';

const file = 'src/TranscriptTest.tsx';
if (!fs.existsSync(file)) {
  console.error('Could not find src/TranscriptTest.tsx. Open a terminal in the motion folder (the one that contains src) and run this again.');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');

if (t.includes("source === 'recording'")) {
  console.log('Already applied. Nothing changed.');
  process.exit(0);
}
const fail = (what) => {
  console.error(`Could not find the place to change: ${what}. Nothing was changed. Send me this message.`);
  process.exit(1);
};

const sigRe = /const importVoiceNote = \(lines: \{ text: string; start: number \}\[\]\) => \{/;
if (!sigRe.test(t)) fail('the voice note function (did apply-voicenote.mjs run first?)');
t = t.replace(sigRe, 'const importVoiceNote = (lines: { text: string; start: number }[], source?: string) => {');

const speakerRe = /speaker: 'Voice note',/;
if (!speakerRe.test(t)) fail('the speaker label');
t = t.replace(speakerRe, "speaker: source === 'recording' ? 'Recording' : 'Voice note',");

fs.writeFileSync(file + '.bak-recording', raw);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Done. A copy of your old file was saved as src/TranscriptTest.tsx.bak-recording');
