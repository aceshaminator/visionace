/**
 * Motion Local Audio-to-Viseme Engine
 * Captures microphone audio and maps phonemes → visemes in real time.
 */

type VisemeMap = { [phoneme: string]: number };

const PHONEME_TO_VISEME: VisemeMap = {
  "p": 1, "b": 1, "m": 1, // closed lips
  "a": 2, "e": 2,         // open vowels
  "o": 3, "u": 3,         // rounded vowels
  "f": 4, "v": 4,         // teeth on lip
  "l": 5, "n": 5          // tongue forward
};

export class AudioVisemeEngine {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private onVisemeUpdate?: (visemeId: number, volume: number) => void;

  constructor(onVisemeUpdate: (visemeId: number, volume: number) => void) {
    this.onVisemeUpdate = onVisemeUpdate;
  }

  public async startListening(): Promise<void> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Use Web Speech API for phoneme recognition
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
        const phoneme = transcript.charAt(transcript.length - 1); // crude phoneme approx
        const visemeId = PHONEME_TO_VISEME[phoneme] || 0;
        if (this.onVisemeUpdate) {
          this.onVisemeUpdate(visemeId, 50); // volume placeholder
        }
      };
      recognition.start();

      this.processAudioLoop();
    } catch (err) {
      console.error("Microphone access denied or audio context blocked:", err);
      throw new Error("Could not start audio engine.");
    }
  }

  private processAudioLoop = (): void => {
    // Optional: keep FFT volume for intensity feedback
    if (!this.audioContext) return;
    this.animationFrameId = requestAnimationFrame(this.processAudioLoop);
  };

  public stopListening(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
