// Adds the voice note card to src/TranscriptTest.tsx. Run from the motion folder: node apply-voicenote.mjs
import fs from 'node:fs';

const file = 'src/TranscriptTest.tsx';
if (!fs.existsSync(file)) {
  console.error('Could not find src/TranscriptTest.tsx. Open a terminal in the motion folder (the one that contains src) and run this again.');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'utf8');
const crlf = raw.includes('\r\n');
let t = raw.replace(/\r\n/g, '\n');

if (t.includes('VoiceNoteImport')) {
  console.log('Already applied. Nothing changed.');
  process.exit(0);
}

const fail = (what) => {
  console.error(`Could not find the place to add: ${what}. Nothing was changed. Send me this message.`);
  process.exit(1);
};

// 1. the import
const importRe = /^import \{ estimatePitch, guessVoice \} from '\.\/pitch';[ \t]*$/m;
if (!importRe.test(t)) fail('the import line');
t = t.replace(importRe, (m) => `${m}\nimport VoiceNoteImport from './VoiceNoteImport';`);

// 2. the function that puts the written-out lines into the captions
const fnAnchor = 'const confirmThreat = (yes: boolean) => {';
if (!t.includes(fnAnchor)) fail('the voice note function');
const fn = `// Adds the lines written out from an imported voice note (WhatsApp or any other app) to the captions.
  const importVoiceNote = (lines: { text: string; start: number }[]) => {
    const clock = (s: number) => \`\${Math.floor(s / 60)}:\${String(Math.floor(s % 60)).padStart(2, '0')}\`;
    let firstThreat: { id: string; text: string; phrase: string } | null = null;
    const made: TranscriptEntry[] = [];
    for (const l of lines) {
      const text = l.text.trim();
      if (!text) continue;
      const th = detectThreat(text);
      const id = Math.random().toString(36).substring(2);
      if (th && !firstThreat) firstThreat = { id, text, phrase: th.phrase };
      made.push({ id, speaker: 'Voice note', text, timestamp: clock(l.start), rude: hasProfanity(text), threat: !!th });
    }
    if (!made.length) return;
    setEntries((prev) => {
      const updated = [...prev, ...made];
      try { localStorage.setItem('motion_transcript_entries', JSON.stringify(updated)); } catch { /* storage unavailable */ }
      return updated;
    });
    if (firstThreat && safetyRef.current.threatAlerts) raiseThreat(firstThreat.id, firstThreat.text, firstThreat.phrase);
  };

  `;
t = t.replace(fnAnchor, () => fn + fnAnchor);

// 3. the card, placed just above "Your reply"
const cardRe = /<div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 p-3">\s*<div className="mb-2 flex items-center justify-between">\s*<h3 [^>]*>Your reply<\/h3>/;
if (!cardRe.test(t)) fail('the voice note card');
t = t.replace(cardRe, (m) => `<VoiceNoteImport onLines={importVoiceNote} disabled={recording} />\n\n            ${m}`);

fs.writeFileSync(file + '.bak-voicenote', raw);
fs.writeFileSync(file, crlf ? t.replace(/\n/g, '\r\n') : t);
console.log('Done. A copy of your old file was saved as src/TranscriptTest.tsx.bak-voicenote');
