import React, { useRef, useEffect } from 'react';

interface VoiceVisualizerProps {
  analyserNode: AnalyserNode | null;
  isListening: boolean;
  isSpeaking: boolean;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ analyserNode, isListening, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with null. useRef requires an initial value.
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode) return;

    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      
      analyserNode.getByteFrequencyData(dataArray);

      let average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      average = isListening || isSpeaking ? average : 0;
      
      const width = canvas.width;
      const height = canvas.height;
      const baseRadius = 50;
      const maxRadiusGrowth = 70;
      const radius = baseRadius + (average / 255) * maxRadiusGrowth;
      
      canvasCtx.clearRect(0, 0, width, height);
      
      // Draw the outer, pulsing circle
      if (average > 1) { // Only draw if there's sound
        const gradient = canvasCtx.createRadialGradient(width / 2, height / 2, baseRadius, width / 2, height / 2, radius);
        const color = isSpeaking ? '59, 130, 246' : '200, 200, 220'; // Blue for speaking, whiteish for listening
        gradient.addColorStop(0, `rgba(${color}, 0.4)`);
        gradient.addColorStop(0.5, `rgba(${color}, 0.2)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        canvasCtx.fillStyle = gradient;
        canvasCtx.beginPath();
        canvasCtx.arc(width / 2, height / 2, radius, 0, 2 * Math.PI);
        canvasCtx.fill();
      }
    };

    draw();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyserNode, isListening, isSpeaking]);

  return (
    <canvas 
      ref={canvasRef}
      width="300"
      height="200"
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
    />
  );
};
