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
  const [voice, setVoice] = useState<string>('google:Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter for relevant languages if needed, but here we show all
        setSystemVoices(voices);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const getOSName = () => {
    const ua = window.navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "Windows";
    if (ua.indexOf("Mac") !== -1) return "macOS";
    if (ua.indexOf("Linux") !== -1) return "Linux";
    if (ua.indexOf("Android") !== -1) return "Android";
    if (ua.indexOf("like Mac") !== -1) return "iOS";
    return "OS";
  };

  const osName = getOSName();

  // Clean up audio URL and synthesis on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [audioUrl]);

  const handlePlay = async () => {
    const isGoogleVoice = voice.startsWith('google:');

    if (isGoogleVoice) {
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
        const googleVoiceName = voice.split(':')[1];
        console.log("TTS: Starting generation with Google voice:", googleVoiceName);
        
        const base64Pcm = await TTSService.generateSpeech(text, { 
          voiceName: googleVoiceName as any,
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
    } else {
      // System Voice logic
      if (synthRef.current) {
        if (isPlaying) {
          synthRef.current.cancel();
          setIsPlaying(false);
          return;
        }

        const voiceIndex = parseInt(voice.split(':')[1]);
        const selectedVoice = systemVoices[voiceIndex];
        
        if (selectedVoice) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = selectedVoice;
          
          utterance.onstart = () => setIsPlaying(true);
          utterance.onend = () => setIsPlaying(false);
          utterance.onerror = (event) => {
            console.error("SpeechSynthesis Error:", event);
            setIsPlaying(false);
          };

          utteranceRef.current = utterance;
          synthRef.current.speak(utterance);
        }
      }
    }
  };

  const handleStop = () => {
    if (voice.startsWith('google:')) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      }
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
        setIsPlaying(false);
      }
    }
  };

  const handleDownload = () => {
    if (audioUrl && voice.startsWith('google:')) {
      const googleVoiceName = voice.split(':')[1];
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `speech-${googleVoiceName}-${Date.now()}.wav`;
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
            const newVoice = e.target.value;
            setVoice(newVoice);
            
            // Stop current playback if voice changes
            handleStop();

            // Reset audio if voice changes
            if (audioUrl) {
              URL.revokeObjectURL(audioUrl);
              setAudioUrl(null);
            }
          }}
          className="text-[11px] bg-transparent border-none focus:ring-0 cursor-pointer text-zinc-600 font-semibold p-0 h-auto leading-none max-w-[150px]"
          disabled={isLoading}
        >
          <optgroup label="Google Cloud (Gemini)">
            <option value="google:Kore">Kore (Google)</option>
            <option value="google:Fenrir">Fenrir (Google)</option>
            <option value="google:Puck">Puck (Google)</option>
            <option value="google:Charon">Charon (Google)</option>
            <option value="google:Zephyr">Zephyr (Google)</option>
          </optgroup>
          {systemVoices.length > 0 && (
            <optgroup label={`System Voices (${osName})`}>
              {systemVoices.map((v, i) => (
                <option key={i} value={`system:${i}`}>
                  {v.name} ({osName})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="h-4 w-[1px] bg-zinc-300 mx-0.5" />

      <div className="flex items-center gap-0.5">
        <button
          onClick={handlePlay}
          disabled={isLoading || !text}
          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
          title={isPlaying ? "Pause/Stop" : "Play"}
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
          disabled={!audioUrl || isLoading || !voice.startsWith('google:')}
          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg transition-all disabled:opacity-50"
          title={voice.startsWith('google:') ? "Download WAV" : "Download not available for system voices"}
        >
          <Download size={14} className={audioUrl && voice.startsWith('google:') ? "text-zinc-700" : "text-zinc-400"} />
        </button>
      </div>
      
      {status === "Error" && (
        <span className="text-[9px] font-bold text-red-500 px-2 uppercase">Error</span>
      )}
    </div>
  );
};
