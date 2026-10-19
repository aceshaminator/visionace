// public/vosk-worker.js

// Load the hosted Vosk glue code
importScripts('https://ccoreilly.github.io/vosk-browser/vosk.js');

let Module, model, recognizer;

onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    // Load the WASM from the hosted demo
    Module = await Vosk.createModule({
      wasmPath: 'https://ccoreilly.github.io/vosk-browser/vosk.wasm'
    });
    model = new Module.Model(payload.modelPath);
    recognizer = new Module.Recognizer({ model, sampleRate: 16000 });
    postMessage({ type: 'ready' });
  }

  if (type === 'audio' && recognizer) {
    const buffer = payload.buffer;
    const result = recognizer.acceptWaveform(buffer);
    if (result) {
      const res = recognizer.result();
      postMessage({ type: 'partial', text: res.text });
    } else {
      const res = recognizer.partialResult();
      postMessage({ type: 'partial', text: res.partial });
    }
  }

  if (type === 'final' && recognizer) {
    const res = recognizer.finalResult();
    console.log('Final result:', res.text);
    postMessage({ type: 'final', text: res.text });
  }

  if (type === 'close') {
    recognizer.free();
    model.free();
    close();
  }
};
