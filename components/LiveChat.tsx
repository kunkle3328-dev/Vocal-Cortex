import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audio';
import { findProduct } from '../utils/knowledgeBase';
import { Bot, Microphone, StopCircle, User, Spinner, AudioWave } from './Icons';
import { VoiceVisualizer } from './VoiceVisualizer';

type SessionStatus = 'idle' | 'connecting' | 'connected' | 'error';
interface TranscriptEntry {
  speaker: 'user' | 'model' | 'system';
  text: string;
}

const LIVE_INPUT_SAMPLE_RATE = 16000;
const LIVE_OUTPUT_SAMPLE_RATE = 24000;

const productLookupFunctionDeclaration: FunctionDeclaration = {
  name: 'productLookup',
  description: 'Get detailed information about a specific product from the knowledge base, such as price, features, and stock status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      productName: {
        type: Type.STRING,
        description: 'The name of the product to look up. For example, "NovaBook Pro" or "StellarPhone Zen".',
      },
    },
    required: ['productName'],
  },
};

const audioProcessorString = `
class AudioProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const pcmData = input[0];
      this.port.postMessage(pcmData);
    }
    return true;
  }
}
registerProcessor('audio-processor', AudioProcessor);
`;

export const LiveChat: React.FC = () => {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const isModelSpeakingRef = useRef(false);

  // Using `any` to handle the unexported `LiveSession` type from the SDK.
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const scrollToBottom = () => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [transcript]);
  
  const stopConversation = useCallback(async () => {
    setStatus('idle');
    isModelSpeakingRef.current = false;

    if (sessionPromiseRef.current) {
      try {
        const session = await sessionPromiseRef.current;
        session.close();
      } catch (e) {
        console.error("Error closing session:", e);
      } finally {
        sessionPromiseRef.current = null;
      }
    }

    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (workletNodeRef.current) {
        workletNodeRef.current.port.onmessage = null;
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
    }
     if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
        analyserNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        await outputAudioContextRef.current.close().catch(console.error);
        outputAudioContextRef.current = null;
    }
    nextStartTimeRef.current = 0;
  }, []);

  const startConversation = useCallback(async () => {
    setStatus('connecting');
    setError(null);
    setTranscript([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContext({ sampleRate: LIVE_INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new AudioContext({ sampleRate: LIVE_OUTPUT_SAMPLE_RATE });
      
      const workletBlob = new Blob([audioProcessorString], { type: 'application/javascript' });
      const workletURL = URL.createObjectURL(workletBlob);
      await inputAudioContextRef.current.audioWorklet.addModule(workletURL);
      
      const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'audio-processor');
      workletNodeRef.current = workletNode;
      analyserNodeRef.current = inputAudioContextRef.current.createAnalyser();
      analyserNodeRef.current.fftSize = 256;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          tools: [{ functionDeclarations: [productLookupFunctionDeclaration] }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: "You are Aura, a friendly and insightful AI companion. Your goal is to have natural, free-flowing conversations. Be curious, engaging, and keep your responses concise to encourage a back-and-forth dialogue. You can use the `productLookup` tool if asked about specific tech products, but your primary role is to be a great conversationalist.",
        },
        callbacks: {
          onopen: () => {
            setStatus('connected');
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            mediaStreamSourceRef.current = source;
            
            workletNode.port.onmessage = (event) => {
              const pcmBlob = createPcmBlob(event.data);
              sessionPromiseRef.current?.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(analyserNodeRef.current!).connect(workletNode).connect(inputAudioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'productLookup') {
                  const productName = fc.args.productName as string;
                  setTranscript(prev => [...prev, { speaker: 'system', text: `Searching for "${productName}"...`}]);
                  const result = findProduct(productName);
                  sessionPromiseRef.current?.then((session) => {
                    session.sendToolResponse({
                      functionResponses: {
                        id : fc.id,
                        name: fc.name,
                        response: { result: JSON.stringify(result) },
                      }
                    })
                  });
                }
              }
            }

            if (message.serverContent?.outputTranscription) {
              currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              isModelSpeakingRef.current = false;
              const fullInput = currentInputTranscriptionRef.current.trim();
              const fullOutput = currentOutputTranscriptionRef.current.trim();
              
              setTranscript(prev => {
                let newTranscript = [...prev];
                // Clean up previous system message if it exists
                if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].speaker === 'system') {
                    newTranscript.pop();
                }
                if (fullInput) newTranscript.push({ speaker: 'user', text: fullInput });
                if (fullOutput) newTranscript.push({ speaker: 'model', text: fullOutput });
                return newTranscript;
              });

              currentInputTranscriptionRef.current = '';
              currentOutputTranscriptionRef.current = '';
            }
            
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
                isModelSpeakingRef.current = true;
                const outputCtx = outputAudioContextRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, LIVE_OUTPUT_SAMPLE_RATE, 1);
                const source = outputCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputCtx.destination);
                source.addEventListener('ended', () => {
                  sourcesRef.current.delete(source);
                  if (sourcesRef.current.size === 0) {
                     isModelSpeakingRef.current = false;
                  }
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(source => source.stop());
                sourcesRef.current.clear();
                isModelSpeakingRef.current = false;
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            setError(`Connection error: ${e.message}`);
            stopConversation();
          },
          onclose: () => {
             // Handled by user action or error
          },
        },
      });

    } catch (err) {
      setError('Failed to start conversation. Please grant microphone permissions.');
      setStatus('error');
      console.error(err);
      await stopConversation();
    }
  }, [stopConversation]);

  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);
  
  const getStatusText = () => {
    switch(status) {
        case 'idle': return 'Press the icon to start'
        case 'connecting': return 'Connecting...'
        case 'connected':
             if (isModelSpeakingRef.current) return 'Aura is speaking...'
             return 'Listening...'
        case 'error': return error;
    }
  }

  const handleButtonClick = () => {
    if (status === 'idle' || status === 'error') {
      startConversation();
    } else {
      stopConversation();
    }
  };

  const renderTranscript = () => (
    <div className="flex-grow bg-gray-800 rounded-lg p-4 overflow-y-auto space-y-4">
        {transcript.length === 0 && status !== 'connecting' && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <AudioWave className="w-24 h-16 mb-4 text-gray-600" />
                <p className='text-lg font-medium'>Aura is ready to chat.</p>
                <p className='text-center text-sm'>Try asking: "What's the weather like?" <br/> or "Tell me about the StellarPhone Zen."</p>
            </div>
        )}
        {transcript.map((entry, index) => {
            if (entry.speaker === 'system') {
                return (
                    <div key={index} className="flex justify-center items-center my-2">
                        <div className="text-xs text-gray-400 bg-gray-700/50 px-3 py-1 rounded-full flex items-center gap-2">
                            <Spinner className="w-3 h-3"/> 
                            <span>{entry.text}</span>
                        </div>
                    </div>
                )
            }
            return (
                <div key={index} className={`flex items-start gap-3 ${entry.speaker === 'user' ? 'justify-end' : ''}`}>
                    {entry.speaker === 'model' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center"><Bot className="w-5 h-5" /></div>}
                    <div className={`max-w-md lg:max-w-2xl px-4 py-2 rounded-lg ${entry.speaker === 'user' ? 'bg-gray-700' : 'bg-sky-900/70'}`}>
                        <p>{entry.text}</p>
                    </div>
                    {entry.speaker === 'user' && <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center"><User className="w-5 h-5" /></div>}
                </div>
            )
        })}
        <div ref={transcriptEndRef} />
    </div>
  )

  return (
    <div className="bg-gray-900 rounded-lg shadow-xl h-full flex flex-col p-4 md:p-6 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-sky-400">Live Conversation with Aura</h2>
        <div className="flex-grow flex flex-col gap-4 min-h-0">
          {renderTranscript()}
          <div className="relative flex-shrink-0 flex flex-col items-center justify-center pt-8 pb-4">
            <VoiceVisualizer
                analyserNode={analyserNodeRef.current}
                isListening={status === 'connected' && !isModelSpeakingRef.current}
                isSpeaking={isModelSpeakingRef.current}
            />
            <button
              onClick={handleButtonClick}
              disabled={status === 'connecting'}
              className="relative z-10 w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-white transition-all duration-300 ease-in-out hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
              aria-label={status === 'connected' ? 'Stop conversation' : 'Start conversation'}
            >
              {status === 'connecting' && <Spinner className="w-10 h-10" />}
              {status !== 'connecting' && status !== 'connected' && <Microphone className="w-10 h-10" />}
              {status === 'connected' && <StopCircle className="w-10 h-10 text-red-400" />}
            </button>
            <p className={`relative z-10 mt-4 text-sm transition-colors duration-300 ${status === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
                {getStatusText()}
            </p>
          </div>
        </div>
    </div>
  );
};
