// Replaces the old Sign mode panel with the fingerspelling hand. Run from the motion folder: node apply-fingerspell.mjs
import fs from 'node:fs';

const file = 'src/TranscriptTest.tsx';
if (!fs.existsSync(file)) {
  console.error('Could not find src/TranscriptTest.tsx. Open a terminal in the motion folder (the one that contains src) and run this again.');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');

if (t.includes('FingerSpell')) {
  console.log('Already applied. Nothing changed.');
  process.exit(0);
}
const fail = (what) => {
  console.error(`Could not find the place to change: ${what}. Nothing was changed. Send me this message.`);
  process.exit(1);
};

// 1. the import
const imp = /^import VoiceNoteImport from '\.\/VoiceNoteImport';[ \t]*$/m;
const imp2 = /^import \{ estimatePitch, guessVoice \} from '\.\/pitch';[ \t]*$/m;
if (imp.test(t)) t = t.replace(imp, (m) => `${m}\nimport FingerSpell from './FingerSpell';`);
else if (imp2.test(t)) t = t.replace(imp2, (m) => `${m}\nimport FingerSpell from './FingerSpell';`);
else fail('the import line');

// 2. the old Sign mode panel
const panelRe = /\{appMode === 'sign' && \(\s*<Panel[\s\S]*?<\/Panel>\s*\)\}/;
const found = t.match(panelRe);
if (!found || !found[0].includes('Sign language') || !found[0].includes('signContainerRef')) fail('the old Sign language panel');
t = t.replace(
  panelRe,
  () =>
    "{appMode === 'sign' && (\n          <FingerSpell latestCaption={entries.filter((e) => e.speaker !== 'You').slice(-1).map((e) => e.text).join(' ')} />\n        )}",
);

fs.writeFileSync(file + '.bak-fingerspell', raw);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Done. A copy of your old file was saved as src/TranscriptTest.tsx.bak-fingerspell');
