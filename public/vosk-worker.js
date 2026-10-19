// public/vosk-worker.js

// Load the local Vosk runtime script from the public folder
importScripts('./vosk.js');

let model, recognizer;

onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    try {
      // Initialize the model locally using vosk-browser's built-in loader
      model = await Vosk.createModel(payload.modelPath);
      recognizer = new model.KaldiRecognizer(16000);

      recognizer.on('result', (message) => {
        if (message.result && message.result.text) {
          postMessage({ type: 'final', text: message.result.text });
        }
      });

      recognizer.on('partial', (message) => {
        if (message.partial !== undefined) {
          postMessage({ type: 'partial', text: message.partial });
        }
      });

      postMessage({ type: 'ready' });
    } catch (err) {
      console.error('Failed to initialize model in worker:', err);
      postMessage({ type: 'error', text: err.message });
    }
  }

  if (type === 'audio' && recognizer) {
    try {
      recognizer.acceptWaveform(payload.buffer);
    } catch (err) {
      console.error('Error accepting waveform:', err);
    }
  }

  if (type === 'final' && recognizer) {
    try {
      const res = recognizer.finalResult();
      if (res && res.text) {
        postMessage({ type: 'final', text: res.text });
      }
    } catch (err) {
      console.error('Error getting final result:', err);
    }
  }

  if (type === 'close') {
    if (recognizer) recognizer.free();
    if (model) model.free();
    close();
  }
};