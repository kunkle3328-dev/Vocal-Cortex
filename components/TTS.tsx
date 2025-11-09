import React, { useState, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { decode, decodeAudioData } from '../utils/audio';
import { Play, Spinner, Sparkles } from './Icons';

const TTS_OUTPUT_SAMPLE_RATE = 24000;
const PREBUILT_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

export const TTS: React.FC = () => {
  const [text, setText] = useState<string>('Hello! Gemini is a powerful AI model that can generate human-like text and speech.');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleEnhanceText = async () => {
    if (!text.trim() || isEnhancing) return;
    setIsEnhancing(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      const response = await ai.models.generateContent({
          model: 'gemini-flash-lite-latest',
          contents: `You are a writing assistant. Proofread and enhance the following text for clarity, conciseness, and impact. Return only the improved text, without any introductory phrases like "Here's the improved text:".\n\nOriginal text:\n${text}`
      });
      setText(response.text);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to enhance text.');
    } finally {
      setIsEnhancing(false);
    }
  }
  
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
      <div className="flex-grow flex flex-col gap-6">
        <div>
            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">Select Voice</label>
            <select
                id="voice-select"
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
            >
                {PREBUILT_VOICES.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                ))}
            </select>
        </div>
        <div className='flex flex-col flex-grow'>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="tts-text" className="block text-sm font-medium text-gray-300">Text to Synthesize</label>
                <button
                    onClick={handleEnhanceText}
                    disabled={isEnhancing || !text.trim()}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 text-sky-300 text-xs font-semibold rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isEnhancing ? (
                        <>
                            <Spinner className="w-4 h-4" />
                            <span>Enhancing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4" />
                            <span>Enhance with AI</span>
                        </>
                    )}
                </button>
            </div>
            <textarea
                id="tts-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to generate speech..."
                className="w-full flex-grow bg-gray-800 text-gray-200 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                rows={10}
            />
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>
      <div className="flex-shrink-0 mt-6">
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