import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Spinner, UploadCloud, FileIcon, ImageIcon, Bot, ExternalLink } from './Icons';

const SYSTEM_INSTRUCTION = `You are Vocal Cortex — a multimodal conversational intelligence system built for document comprehension and visual reasoning. When analyzing visuals or documents, explain your observations clearly and concisely.`;

interface GroundingChunk {
    web: {
        uri: string;
        title: string;
    };
}

export const AIAnalysis: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [groundingChunks, setGroundingChunks] = useState<GroundingChunk[] | null>(null);
    const [isDragOver, setIsDragOver] = useState<boolean>(false);

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    }

    const handleAnalyze = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);
        setGroundingChunks(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            let result;

            if (file) {
                // Multimodal Document/Image Analysis
                const base64Data = await fileToBase64(file);
                const filePart = { inlineData: { data: base64Data, mimeType: file.type } };
                const textPart = { text: prompt };

                result = await ai.models.generateContent({
                    model: 'gemini-2.5-pro',
                    contents: { parts: [textPart, filePart] },
                    config: { systemInstruction: SYSTEM_INSTRUCTION }
                });
            } else {
                // Text-only query with Google Search grounding
                result = await ai.models.generateContent({
                    model: "gemini-2.5-pro",
                    contents: prompt,
                    config: {
                      tools: [{googleSearch: {}}],
                    },
                 });
                 const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
                 if (chunks) {
                     setGroundingChunks(chunks.filter((c: any) => c.web));
                 }
            }

            setResponse(result.text);

        } catch (err: any) {
            console.error("AI Analysis Error:", err);
            setError(err.message || "An unexpected error occurred during analysis.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFileChange = (files: FileList | null) => {
        if (files && files.length > 0) {
            setFile(files[0]);
            setResponse(null);
            setError(null);
            setGroundingChunks(null);
        }
    };

    const dropHandler = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        setIsDragOver(false);
        handleFileChange(ev.dataTransfer.files);
    };

    const dragOverHandler = (ev: React.DragEvent<HTMLDivElement>) => {
        ev.preventDefault();
        setIsDragOver(true);
    };
    
    const dragLeaveHandler = () => setIsDragOver(false);

    return (
        <div className="bg-gray-900 rounded-lg shadow-xl h-full flex flex-col p-4 md:p-6 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-sky-400">AI Analysis</h2>
            <div className="flex-grow flex flex-col gap-6">
                
                <div 
                    onDrop={dropHandler}
                    onDragOver={dragOverHandler}
                    onDragLeave={dragLeaveHandler}
                    className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors ${isDragOver ? 'border-sky-500 bg-gray-800/50' : 'border-gray-600'}`}
                >
                    {!file ? (
                        <>
                            <UploadCloud className="w-12 h-12 text-gray-500 mb-4" />
                            <label htmlFor="file-upload" className="font-semibold text-sky-400 cursor-pointer hover:underline">
                                Choose a file for analysis
                            </label>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => handleFileChange(e.target.files)} />
                            <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
                            <p className="text-xs text-gray-500 mt-2">(Optional) Or just ask a question to use Google Search.</p>
                        </>
                    ) : (
                         <div className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {file.type.startsWith('image/') ? <ImageIcon className="w-6 h-6 text-sky-400 flex-shrink-0"/> : <FileIcon className="w-6 h-6 text-sky-400 flex-shrink-0"/>}
                                <span className="text-gray-300 font-medium truncate">{file.name}</span>
                                <span className="text-gray-500 text-sm flex-shrink-0">({(file.size / 1024).toFixed(2)} KB)</span>
                            </div>
                            <button onClick={() => setFile(null)} className="ml-4 text-gray-400 hover:text-red-400 transition-colors text-sm font-semibold flex-shrink-0">
                                Remove
                            </button>
                        </div>
                    )}
                </div>
                
                <div className='flex flex-col flex-grow'>
                    <label htmlFor="doc-prompt" className="block text-sm font-medium text-gray-300 mb-2">Your question</label>
                    <textarea
                        id="doc-prompt"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={file ? "e.g., Summarize the key points of this document." : "e.g., What are the latest AI news?"}
                        className="w-full flex-grow bg-gray-800 text-gray-200 p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                        rows={3}
                    />
                </div>
            </div>
            <div className="flex-shrink-0 mt-6">
                <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !prompt.trim()}
                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <><Spinner className="w-6 h-6" />Analyzing...</> : "Analyze"}
                </button>
            </div>
            
            {(isLoading || error || response) && (
                <div className="mt-6 p-4 bg-gray-800/80 rounded-lg border border-gray-700 min-h-[100px]">
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    {response && (
                         <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-sky-400 flex items-center gap-2">
                                <Bot className="w-5 h-5" />
                                Analysis Result
                            </h3>
                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 whitespace-pre-wrap">{response}</div>
                            {groundingChunks && groundingChunks.length > 0 && (
                                <div className="pt-3 border-t border-gray-700">
                                    <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources from Google Search:</h4>
                                    <ul className="space-y-1">
                                        {groundingChunks.map((chunk, index) => (
                                            <li key={index}>
                                                <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sky-400 text-sm hover:underline truncate">
                                                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">{chunk.web.title || chunk.web.uri}</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};