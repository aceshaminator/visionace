export function useFeedback() {
  const triggerFeedback = (message: string, speakAloud: boolean = false) => {
    // 1. Trigger Speech Synthesis if requested
    if (speakAloud && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any ongoing speech
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 0.9; // Slightly slower for senior accessibility
      window.speechSynthesis.speak(utterance);
    }
  };

  return { triggerFeedback };
}