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
  const [status, setStatus] = useState<string | null>(null);
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
      setStatus("Generating...");
      console.log("TTS: Starting generation with voice:", voice);
      
      const base64Pcm = await TTSService.generateSpeech(text, { 
        voiceName: voice,
        apiKey: geminiApiKey 
      });
      
      console.log("TTS: Audio data received, converting to WAV...");
      const wavBlob = TTSService.pcmToWav(base64Pcm);
      const url = URL.createObjectURL(wavBlob);
      
      setAudioUrl(url);
      setStatus(null);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("TTS Playback Error:", error);
      setStatus("Error");
      alert("Failed to generate speech. Please check your API key and network.");
      setTimeout(() => setStatus(null), 3000);
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
    <div className={`flex items-center gap-1 bg-zinc-100 p-1 rounded-xl ${className}`}>
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        className="hidden"
      />
      
      <div className="flex items-center gap-1 px-2">
        <Volume2 size={14} className="text-zinc-500" />
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
          className="text-[11px] bg-transparent border-none focus:ring-0 cursor-pointer text-zinc-600 font-semibold p-0 h-auto leading-none"
          disabled={isLoading}
        >
          <option value="Kore">Kore</option>
          <option value="Fenrir">Fenrir</option>
          <option value="Puck">Puck</option>
          <option value="Charon">Charon</option>
          <option value="Zephyr">Zephyr</option>
        </select>
      </div>

      <div className="h-4 w-[1px] bg-zinc-300 mx-0.5" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={handlePlay}
          disabled={isLoading || !text}
          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
          title={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <div className="flex items-center gap-1.5">
              <Loader2 size={14} className="animate-spin text-amber-600" />
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Gen...</span>
            </div>
          ) : isPlaying ? (
            <Pause size={14} className="text-amber-600 fill-amber-600" />
          ) : (
            <Play size={14} className="text-zinc-600 fill-zinc-600" />
          )}
        </button>

        <AnimatePresence>
          {isPlaying && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleStop}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              title="Stop"
            >
              <StopCircle size={14} className="text-zinc-600" />
            </motion.button>
          )}
        </AnimatePresence>

        <button
          onClick={handleDownload}
          disabled={!audioUrl || isLoading}
          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
          title="Download WAV"
        >
          <Download size={14} className={audioUrl ? "text-zinc-700" : "text-zinc-400"} />
        </button>
      </div>
      
      {status === "Error" && (
        <span className="text-[9px] font-bold text-red-500 px-2 uppercase">Error</span>
      )}
    </div>
  );
};
