import { GoogleGenAI, Modality } from "@google/genai";

export interface TTSOptions {
  voiceName?: 'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Zephyr';
  apiKey?: string;
}

/**
 * Service for generating speech using Gemini TTS
 */
export const TTSService = {
  /**
   * Generates speech from text using Gemini 2.5 Flash Preview TTS
   * Returns a base64 encoded PCM string
   * Includes retry logic for 500 errors
   */
  async generateSpeech(text: string, options: TTSOptions = {}, retries: number = 2): Promise<string> {
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      throw new Error("Gemini API Key is required for TTS");
    }

    // Basic text cleaning to remove markdown that might confuse the TTS model
    const cleanText = text
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*/g, '')     // Remove bold
      .replace(/\*/g, '')      // Remove italics
      .replace(/`{1,3}.*?`{1,3}/gs, '') // Remove code blocks
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links but keep text
      .trim();

    if (!cleanText) return "";

    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: cleanText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { 
                voiceName: options.voiceName || 'Kore' 
              },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (!base64Audio) {
        throw new Error("No audio data received from Gemini TTS");
      }

      return base64Audio;
    } catch (error: any) {
      // If it's a 500 error and we have retries left, wait and try again
      const is500 = error?.message?.includes('500') || error?.status === 500;
      if (is500 && retries > 0) {
        const delay = (3 - retries) * 1000; // 1s, 2s delay
        console.warn(`TTS: 500 error, retrying in ${delay}ms... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.generateSpeech(text, options, retries - 1);
      }

      console.error("TTS Generation Error:", error);
      throw error;
    }
  },

  /**
   * Converts raw PCM data (base64) to a WAV Blob
   * Gemini TTS returns PCM 16-bit Little Endian at 24000Hz
   */
  pcmToWav(base64Pcm: string, sampleRate: number = 24000): Blob {
    const binaryString = atob(base64Pcm);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    /* RIFF identifier */
    this.writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + bytes.length, true);
    /* RIFF type */
    this.writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    this.writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    this.writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, bytes.length, true);

    return new Blob([wavHeader, bytes], { type: 'audio/wav' });
  },

  writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
};
