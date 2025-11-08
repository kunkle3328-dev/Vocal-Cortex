import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audio';
import { Play, Spinner } from './Icons';

const TTS_OUTPUT_SAMPLE_RATE = 24000;
const PREBUILT_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

export const TTS: React.FC = () => {
  const [text, setText] = useState<string>('Hello! Gemini is a powerful AI model that can generate human-like text and speech.');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const handleGenerateSpeech = async () => {
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
          },
        },
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          // FIX: Handle browser compatibility for AudioContext to resolve TypeScript error.
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          audioContextRef.current = new AudioContext({ sampleRate: TTS_OUTPUT_SAMPLE_RATE });
        }
        const audioCtx = audioContextRef.current;
        const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, TTS_OUTPUT_SAMPLE_RATE, 1);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      } else {
        throw new Error('No audio data received from API.');
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate speech.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl h-full flex flex-col p-4 md:p-6 border border-gray-700">
      <h2 className="text-2xl font-bold mb-4 text-sky-400">Text-to-Speech</h2>
      <div className="flex-grow flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
            <label htmlFor="voice-select" className="sr-only">Select Voice</label>
            <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full md:w-1/3 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
                {PREBUILT_VOICES.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                ))}
            </select>
            <div className="w-full md:w-2/3"></div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to generate speech..."
          className="w-full flex-grow bg-gray-800 text-gray-200 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
          rows={10}
        />
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </div>
      <div className="flex-shrink-0 mt-4">
        <button
          onClick={handleGenerateSpeech}
          disabled={isLoading || !text.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Spinner className="w-6 h-6" />
              Generating...
            </>
          ) : (
            <>
              <Play className="w-6 h-6" />
              Generate & Play Speech
            </>
          )}
        </button>
      </div>
    </div>
  );
};