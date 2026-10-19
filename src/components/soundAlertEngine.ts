/**
 * Motion Environmental Sound Alert Engine
 * Step-by-step decibel monitoring for instant offline safety warnings.
 */

export class SoundAlertEngine {
  private thresholdDb: number = 75; // Decibel trigger threshold for loud alerts
  private onAlertTriggered: (alertMessage: string) => void;

  constructor(onAlertTriggered: (alertMessage: string) => void) {
    this.onAlertTriggered = onAlertTriggered;
  }

  /**
   * Step A: Evaluate incoming audio volume score.
   */
  public evaluateAudioLevel(volumeScore: number): void {
    if (volumeScore >= this.thresholdDb) {
      // Step B: Trigger high-priority alert callback
      this.onAlertTriggered('⚠️ LOUD SOUND DETECTED NEARBY');
    }
  }
}