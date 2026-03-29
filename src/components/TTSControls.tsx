import React, { useState, useRef, useEffect } from 'react';
import { TTSService } from '../services/ttsService';
import { Play, Pause, Download, Volume2, Loader2, StopCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TTSControlsProps {
  text: string;
  geminiApiKey?: string;
  className?: string;
}

export const TTSControls: React.FC<TTSControlsProps> = ({ text, geminiApiKey, className = "" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [voice, setVoice] = useState<'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Zephyr'>('Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const handlePlay = async () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    if (audioRef.current && !isPlaying && audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
      return;
    }

    try {
      setIsLoading(true);
      const base64Pcm = await TTSService.generateSpeech(text, { 
        voiceName: voice,
        apiKey: geminiApiKey 
      });
      
      const wavBlob = TTSService.pcmToWav(base64Pcm);
      const url = URL.createObjectURL(wavBlob);
      
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("TTS Playback Error:", error);
      alert("Failed to generate speech. Please check your API key and network.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `speech-${voice}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className={`flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200 ${className}`}>
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        className="hidden"
      />
      
      <div className="flex items-center gap-1 mr-2">
        <Volume2 size={16} className="text-zinc-500" />
        <select 
          value={voice} 
          onChange={(e) => {
            setVoice(e.target.value as any);
            // Reset audio if voice changes
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
              setAudioUrl(null);
            }
          }}
          className="text-xs bg-transparent border-none focus:ring-0 cursor-pointer text-zinc-600 font-medium"
          disabled={isLoading}
        >
          <option value="Kore">Kore (Male)</option>
          <option value="Fenrir">Fenrir (Male)</option>
          <option value="Puck">Puck (Male)</option>
          <option value="Charon">Charon (Male)</option>
          <option value="Zephyr">Zephyr (Female)</option>
        </select>
      </div>

      <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

      <button
        onClick={handlePlay}
        disabled={isLoading || !text}
        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors disabled:opacity-50"
        title={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin text-amber-600" />
        ) : isPlaying ? (
          <Pause size={18} className="text-amber-600 fill-amber-600" />
        ) : (
          <Play size={18} className="text-zinc-600 fill-zinc-600" />
        )}
      </button>

      {isPlaying && (
        <button
          onClick={handleStop}
          className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors"
          title="Stop"
        >
          <StopCircle size={18} className="text-zinc-600" />
        </button>
      )}

      <button
        onClick={handleDownload}
        disabled={!audioUrl || isLoading}
        className="p-1.5 hover:bg-zinc-200 rounded-md transition-colors disabled:opacity-50"
        title="Download WAV"
      >
        <Download size={18} className={audioUrl ? "text-zinc-700" : "text-zinc-400"} />
      </button>
    </div>
  );
};
