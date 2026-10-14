export const WelcomeModal: React.FC<{ onContinue: () => void }> = ({ onContinue }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
        
        {/* Updated Title */}
        <h2 className="text-3xl font-extrabold text-center text-sky-400 mb-3">
          Feel the Motion
        </h2>
        
        <p className="text-zinc-400 text-center text-sm mb-6">
          Assistive communication bridge for real-time speech visualization and tactile feedback.
        </p>

        <div className="mb-6 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80">
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-2">
            1. Accessibility & Visibility
          </h3>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Optimize font sizes and high-contrast layouts for senior and low-vision readability.
          </p>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all"
        >
          Continue →
        </button>
      </div>
    </div>
  );
};