import { useState, useRef, useCallback, useEffect } from 'react';
import { createModel } from 'vosk-browser';

type EventCallback = (...args: any[]) => void;

export function useVosk(modelPath: string = 'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-en-us-0.15.tar.gz') {
  const [ready, setReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const modelRef = useRef<any>(null);
  const recognizerRef = useRef<any>(null);
  
  const listenersRef = useRef<{ [key: string]: EventCallback[] }>({
    phoneme: [],
    partial: [],
    final: []
  });

  const on = useCallback((eventMap: { [key: string]: EventCallback }) => {
    Object.entries(eventMap).forEach(([event, cb]) => {
      if (listenersRef.current[event]) {
        listenersRef.current[event].push(cb);
      }
    });
  }, []);

  const triggerEvent = (event: string, data: any) => {
    if (listenersRef.current[event]) {
      listenersRef.current[event].forEach(cb => cb(data));
    }
  };

  const initModel = useCallback(async () => {
    if (modelRef.current) return;
    try {
      console.log('Loading Vosk model...');
      const model = await createModel(modelPath);
      modelRef.current = model;

      // Correct constructor method from vosk-browser spec
      const recognizer = new (model as any).KaldiRecognizer(16000);
      recognizerRef.current = recognizer;

      recognizer.on('result', (message: any) => {
        const text = message.result?.text;
        if (text) {
          triggerEvent('final', text);
        }
      });

      recognizer.on('partial', (message: any) => {
        const text = message.partial;
        if (text !== undefined) {
          triggerEvent('partial', text);
        }
      });

      setReady(true);
      console.log('Vosk model initialized successfully.');
    } catch (err: any) {
      console.error('Failed to initialize Vosk model:', err);
      setError(err.message || 'Model load failed');
    }
  }, [modelPath]);

  const sendAudio = useCallback(async (data: Float32Array) => {
    if (!modelRef.current) {
      await initModel();
    }
    if (recognizerRef.current) {
      try {
        recognizerRef.current.acceptWaveform(data);
      } catch (err) {
        console.error('Error accepting waveform:', err);
      }
    }
  }, [initModel]);

  const finalize = useCallback(() => {
    if (recognizerRef.current) {
      try {
        const finalResult = recognizerRef.current.finalResult();
        if (finalResult && finalResult.text) {
          triggerEvent('final', finalResult.text);
        }
      } catch (err) {
        console.error('Error finalizing recognition:', err);
      }
    }
  }, []);

  useEffect(() => {
    initModel();
  }, [initModel]);

  return {
    ready,
    error,
    sendAudio,
    finalize,
    on
  };
}