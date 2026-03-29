import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TTSService } from '../services/ttsService';
import { Play, Pause, Download, Volume2, Loader2, StopCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface TTSControlsProps {
  text: string;
  geminiApiKey?: string;
  className?: string;
}

export const TTSControls: React.FC<TTSControlsProps> = ({ text, geminiApiKey, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [voice, setVoice] = useState<string>('google:Kore');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Google TTS Queue State
  const [googleChunks, setGoogleChunks] = useState<string[]>([]);
  const [currentGoogleChunkIndex, setCurrentGoogleChunkIndex] = useState(0);
  const [googleAudioQueue, setGoogleAudioQueue] = useState<Record<number, string>>({});
  const [isPrefetching, setIsPrefetching] = useState(false);

  // System TTS State
  const [systemChunks, setSystemChunks] = useState<string[]>([]);
  const [currentSystemChunkIndex, setCurrentSystemChunkIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const systemChunksRef = useRef<string[]>([]);
  const currentSystemChunkIndexRef = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isSystemPlayingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
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

  // Clean up audio URLs on unmount or voice change
  const cleanupAudioUrls = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    Object.values(googleAudioQueue).forEach(url => URL.revokeObjectURL(url));
    setGoogleAudioQueue({});
  }, [audioUrl, googleAudioQueue]);

  useEffect(() => {
    return () => {
      cleanupAudioUrls();
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Helper to split text for Google TTS (approx 1 minute chunks ~ 1200 chars)
  const splitTextForGoogle = (fullText: string) => {
    if (!fullText.trim()) return [];

    const sentences = fullText.split(/([.!?]+[\s\n]+)/).reduce((acc: string[], curr, i) => {
      if (i % 2 === 0) acc.push(curr);
      else acc[acc.length - 1] += curr;
      return acc;
    }, []).filter(c => c.trim().length > 0);

    const chunks: string[] = [];
    let currentChunk = "";
    
    sentences.forEach(sentence => {
      // If a single sentence is already too long, split it by words
      if (sentence.length > 1200) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = "";
        
        const words = sentence.split(/\s+/);
        let temp = "";
        words.forEach(word => {
          if ((temp + word).length > 1200) {
            chunks.push(temp.trim());
            temp = word + " ";
          } else {
            temp += word + " ";
          }
        });
        if (temp.trim()) currentChunk = temp;
      } else if ((currentChunk + sentence).length > 1200) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    });
    
    if (currentChunk.trim()) chunks.push(currentChunk.trim());
    return chunks;
  };

  const prefetchNextGoogleChunk = async (index: number, chunks: string[], voiceName: any) => {
    if (index >= chunks.length || googleAudioQueue[index] || isPrefetching) return;

    try {
      setIsPrefetching(true);
      console.log(`TTS: Pre-fetching Google chunk ${index + 1}/${chunks.length}`);
      
      const base64Pcm = await TTSService.generateSpeech(chunks[index], { 
        voiceName,
        apiKey: geminiApiKey 
      });
      
      const wavBlob = TTSService.pcmToWav(base64Pcm);
      const url = URL.createObjectURL(wavBlob);
      
      setGoogleAudioQueue(prev => ({ ...prev, [index]: url }));
    } catch (error) {
      console.error(`TTS Pre-fetch Error for chunk ${index}:`, error);
    } finally {
      setIsPrefetching(false);
    }
  };

  const handlePlay = async () => {
    const isGoogleVoice = voice.startsWith('google:');

    if (isGoogleVoice) {
      if (audioRef.current && isPlaying) {
        handlePause();
        return;
      }

      // Resume Google TTS
      if (audioRef.current && !isPlaying && isPaused && googleAudioQueue[currentGoogleChunkIndex]) {
        console.log("TTS: Resuming Google audio");
        audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
        return;
      }

      try {
        setIsLoading(true);
        setStatus("Generating...");
        const googleVoiceName = voice.split(':')[1];
        
        let chunks = googleChunks;
        // Only re-chunk if we don't have chunks or if we are starting fresh
        if (chunks.length === 0) {
          chunks = splitTextForGoogle(text);
          if (chunks.length === 0) {
            setIsLoading(false);
            return;
          }
          setGoogleChunks(chunks);
          setCurrentGoogleChunkIndex(0);
        }

        const index = currentGoogleChunkIndex;
        let url = googleAudioQueue[index];
        if (!url) {
          const base64Pcm = await TTSService.generateSpeech(chunks[index], { 
            voiceName: googleVoiceName as any,
            apiKey: geminiApiKey 
          });
          const wavBlob = TTSService.pcmToWav(base64Pcm);
          url = URL.createObjectURL(wavBlob);
          setGoogleAudioQueue(prev => ({ ...prev, [index]: url }));
        }
        
        setAudioUrl(url);
        setStatus(null);
        setIsPaused(false);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play();
          setIsPlaying(true);
          prefetchNextGoogleChunk(index + 1, chunks, googleVoiceName);
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
      // System Voice logic with Windows resilience and Resume support
      if (synthRef.current) {
        if (isPlaying) {
          handlePause();
          return;
        }

        // Resume System TTS
        if (isPaused) {
          console.log("TTS: Resuming System voice");
          isSystemPlayingRef.current = true;
          synthRef.current.resume();
          setIsPlaying(true);
          setIsPaused(false);
          return;
        }

        // Fresh start
        synthRef.current.cancel();
        // Chrome bug: sometimes needs a resume after cancel to clear the queue
        synthRef.current.resume();
        
        isSystemPlayingRef.current = true;
        setIsPaused(false);

        const voiceIndex = parseInt(voice.split(':')[1]);
        const selectedVoice = systemVoices[voiceIndex];
        
        if (selectedVoice) {
          if (systemChunksRef.current.length === 0) {
            const rawChunks = text.split(/([.!?]+[\s\n]+)/).reduce((acc: string[], curr, i) => {
              if (i % 2 === 0) acc.push(curr);
              else acc[acc.length - 1] += curr;
              return acc;
            }, []).filter(c => c.trim().length > 0);

            const chunks: string[] = [];
            rawChunks.forEach(chunk => {
              if (chunk.length > 200) {
                const words = chunk.split(/\s+/);
                let current = "";
                words.forEach(word => {
                  if ((current + word).length > 200) {
                    chunks.push(current.trim());
                    current = word + " ";
                  } else {
                    current += word + " ";
                  }
                });
                if (current.trim()) chunks.push(current.trim());
              } else {
                chunks.push(chunk.trim());
              }
            });
            systemChunksRef.current = chunks;
            setSystemChunks(chunks);
            currentSystemChunkIndexRef.current = 0;
            setCurrentSystemChunkIndex(0);
          }

          setIsPlaying(true);

          const speakNextChunk = () => {
            const chunks = systemChunksRef.current;
            const currentIdx = currentSystemChunkIndexRef.current;

            if (!synthRef.current || currentIdx >= chunks.length || !isSystemPlayingRef.current) {
              if (currentIdx >= chunks.length) {
                setIsPlaying(false);
                currentSystemChunkIndexRef.current = 0;
                setCurrentSystemChunkIndex(0);
                systemChunksRef.current = [];
                setSystemChunks([]);
              }
              return;
            }

            const utterance = new SpeechSynthesisUtterance(chunks[currentIdx]);
            utterance.voice = selectedVoice;
            utteranceRef.current = utterance;
            
            let heartbeat: any = null;
            
            utterance.onstart = () => {
              if (!isSystemPlayingRef.current) {
                synthRef.current?.cancel();
                return;
              }
              setIsPlaying(true);
              setCurrentSystemChunkIndex(currentIdx);
              heartbeat = setInterval(() => {
                if (synthRef.current?.speaking && !synthRef.current?.paused) {
                  synthRef.current.pause();
                  synthRef.current.resume();
                } else if (!synthRef.current?.speaking) {
                  clearInterval(heartbeat);
                }
              }, 10000);
            };

            utterance.onend = () => {
              if (heartbeat) clearInterval(heartbeat);
              if (isSystemPlayingRef.current) {
                currentSystemChunkIndexRef.current++;
                setCurrentSystemChunkIndex(currentSystemChunkIndexRef.current);
                setTimeout(speakNextChunk, 100);
              }
            };

            utterance.onerror = (event) => {
              if (heartbeat) clearInterval(heartbeat);
              if (event.error === 'interrupted') {
                if (isSystemPlayingRef.current) setTimeout(speakNextChunk, 100);
              } else if (event.error !== 'canceled') {
                console.error("SpeechSynthesis Error:", event);
                setStatus("Error");
                setTimeout(() => setStatus(null), 3000);
                setIsPlaying(false);
                isSystemPlayingRef.current = false;
              }
            };

            synthRef.current.speak(utterance);
          };

          speakNextChunk();
        }
      }
    }
  };

  const handleGoogleAudioEnded = () => {
    const nextIndex = currentGoogleChunkIndex + 1;
    const googleVoiceName = voice.split(':')[1];

    if (nextIndex < googleChunks.length) {
      const nextUrl = googleAudioQueue[nextIndex];
      if (nextUrl) {
        setCurrentGoogleChunkIndex(nextIndex);
        setAudioUrl(nextUrl);
        if (audioRef.current) {
          audioRef.current.src = nextUrl;
          audioRef.current.play();
          prefetchNextGoogleChunk(nextIndex + 1, googleChunks, googleVoiceName);
        }
      } else {
        setStatus("Buffering...");
        prefetchNextGoogleChunk(nextIndex, googleChunks, googleVoiceName);
      }
    } else {
      setIsPlaying(false);
      setCurrentGoogleChunkIndex(0);
      setGoogleChunks([]);
      setGoogleAudioQueue({});
    }
  };

  // Effect to resume playback if buffering was active and chunk becomes available
  useEffect(() => {
    if (status === "Buffering..." && googleAudioQueue[currentGoogleChunkIndex + 1]) {
      setStatus(null);
      handleGoogleAudioEnded();
    }
  }, [googleAudioQueue, status]);

  const handlePause = () => {
    if (voice.startsWith('google:')) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
      }
    } else {
      if (synthRef.current) {
        // Use native pause for system voices to support true resume
        synthRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
        // Note: we don't set isSystemPlayingRef.current = false here
        // because we want the loop to stay alive (just paused)
      }
    }
  };

  const handleStop = () => {
    isSystemPlayingRef.current = false;
    if (voice.startsWith('google:')) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setCurrentGoogleChunkIndex(0);
      setGoogleChunks([]);
      setGoogleAudioQueue({});
      cleanupAudioUrls();
    } else {
      if (synthRef.current) {
        synthRef.current.cancel();
        // Chrome bug: sometimes needs a resume after cancel to clear the queue
        synthRef.current.resume();
      }
      currentSystemChunkIndexRef.current = 0;
      setCurrentSystemChunkIndex(0);
      systemChunksRef.current = [];
      setSystemChunks([]);
    }
    setIsPlaying(false);
    setIsPaused(false);
    setStatus(null);
  };

  const handleDownload = () => {
    if (audioUrl && voice.startsWith('google:')) {
      const googleVoiceName = voice.split(':')[1];
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `speech-${googleVoiceName}-part${currentGoogleChunkIndex + 1}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className={cn("flex items-center transition-all duration-200", className)}>
      <audio 
        ref={audioRef} 
        onEnded={handleGoogleAudioEnded} 
        className="hidden"
      />

      {!isExpanded ? (
        <button 
          onClick={() => setIsExpanded(true)}
          className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl text-zinc-600 transition-all shadow-sm border border-zinc-200/50"
          title="Show TTS Controls"
        >
          <Volume2 size={18} />
        </button>
      ) : (
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200 shadow-sm animate-in fade-in zoom-in duration-200">
          <div className="flex items-center gap-1 px-2">
            <Volume2 size={14} className="text-zinc-500" />
            <select 
              value={voice} 
              onChange={(e) => {
                const newVoice = e.target.value;
                setVoice(newVoice);
                handleStop();
                cleanupAudioUrls();
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
          
          {(status === "Error" || status === "Buffering...") && (
            <span className={cn(
              "text-[9px] font-bold px-2 uppercase",
              status === "Error" ? "text-red-500" : "text-amber-600"
            )}>{status}</span>
          )}

          {googleChunks.length > 1 && isPlaying && voice.startsWith('google:') && (
            <span className="text-[9px] font-mono text-zinc-400 px-1">
              {currentGoogleChunkIndex + 1}/{googleChunks.length}
            </span>
          )}

          <div className="h-4 w-[1px] bg-zinc-300 mx-0.5" />

          <button 
            onClick={() => setIsExpanded(false)}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-white rounded-lg transition-all"
            title="Collapse"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
