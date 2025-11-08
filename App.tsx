import React, { useState } from 'react';
import { LiveChat } from './components/LiveChat';
import { TTS } from './components/TTS';
import { Bot, Text, VocalCortexLogo } from './components/Icons';

type View = 'live' | 'tts';

const App: React.FC = () => {
  const [view, setView] = useState<View>('live');

  const navButtonClasses = (isActive: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-sky-600 text-white shadow-md'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`;

  return (
    <div className="min-h-screen bg-gray-900 text-white font-sans flex flex-col">
      <header className="bg-gray-800 shadow-lg z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <VocalCortexLogo className="w-8 h-8 text-sky-400" />
            <h1 className="text-xl md:text-2xl font-bold text-sky-400">
              Vocal Cortex
            </h1>
          </div>
          <nav className="flex items-center gap-2 md:gap-4">
            <button onClick={() => setView('live')} className={navButtonClasses(view === 'live')}>
              <Bot className="w-5 h-5" />
              <span className="hidden sm:inline">Live Conversation</span>
            </button>
            <button onClick={() => setView('tts')} className={navButtonClasses(view === 'tts')}>
              <Text className="w-5 h-5" />
              <span className="hidden sm:inline">Text-to-Speech</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {view === 'live' ? <LiveChat /> : <TTS />}
      </main>
      
      <footer className="bg-gray-800 text-center p-4 text-gray-500 text-sm">
          Powered by Gemini | Vocal Cortex
      </footer>
    </div>
  );
};

export default App;