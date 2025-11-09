import React, { useState, useEffect } from "react";
import { DevConsoleCore, DevConfig, Tone, Model } from "../utils/devConsole";
import { Settings } from './Icons';

export default function DevPanel() {
  const [config, setConfig] = useState<DevConfig>(DevConsoleCore.getConfig());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsub = DevConsoleCore.subscribe(setConfig);
    return unsub;
  }, []);

  const updateConfig = (key: keyof DevConfig | 'modelAlias', value: string) => {
    switch (key) {
      case "tone":
        DevConsoleCore.handleCommand(`/set_tone ${value}`);
        break;
      case "modelAlias":
        DevConsoleCore.handleCommand(`/set_model ${value}`);
        break;
      case "persona":
        DevConsoleCore.handleCommand(`/persona ${value}`);
        break;
      case "voiceEnabled":
        DevConsoleCore.handleCommand(`/toggle_voice`);
        break;
      default:
        break;
    }
  };

  const getModelAlias = (model: Model): string => {
      if (model === 'gemini-1.5-flash') return 'fast';
      if (model === 'gemini-2.0-flash') return 'creative';
      return 'deep';
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 flex items-center justify-center rounded-full bg-sky-600 text-white font-semibold shadow-lg hover:bg-sky-500 transition-transform hover:scale-110"
        aria-label="Toggle Developer Panel"
      >
        <Settings className="w-6 h-6" />
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 bg-gray-900/80 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-sky-500/50 w-72 animate-fade-in">
          <h3 className="text-lg font-semibold mb-3 text-sky-400">Dev Controls</h3>

          <label className="block text-sm mb-1 text-gray-400">Tone</label>
          <select
            value={config.tone}
            onChange={(e) => updateConfig("tone", e.target.value)}
            className="w-full mb-3 p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="calm">calm</option>
            <option value="assertive">assertive</option>
            <option value="neutral">neutral</option>
            <option value="friendly">friendly</option>
            <option value="analytical">analytical</option>
          </select>

          <label className="block text-sm mb-1 text-gray-400">Model</label>
          <select
            value={getModelAlias(config.model)}
            onChange={(e) => updateConfig("modelAlias", e.target.value)}
            className="w-full mb-3 p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          >
            <option value="deep">Deep (gemini-2.5-pro)</option>
            <option value="fast">Fast (gemini-1.5-flash)</option>
            <option value="creative">Creative (gemini-2.0-flash)</option>
          </select>

          <label className="block text-sm mb-1 text-gray-400">Persona</label>
          <input
            type="text"
            value={config.persona}
            onChange={(e) => updateConfig("persona", e.target.value)}
            className="w-full mb-3 p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />

          <label className="flex items-center mb-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={config.voiceEnabled}
              onChange={() => updateConfig("voiceEnabled", "")}
              className="mr-2 h-4 w-4 rounded bg-gray-700 border-gray-600 text-sky-500 focus:ring-sky-500"
            />
            Voice Enabled
          </label>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => DevConsoleCore.handleCommand("/status", (msg) => alert(msg))}
              className="flex-1 py-2 bg-sky-600 rounded hover:bg-sky-500 text-sm font-semibold transition-colors"
            >
              Status
            </button>
            <button
              onClick={() => DevConsoleCore.handleCommand("/clear_memory", (msg) => alert(msg))}
              className="flex-1 py-2 bg-red-600/80 rounded hover:bg-red-600 text-sm font-semibold transition-colors"
            >
              Clear Memory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}