import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceName } from "../types";
import { decodeBase64PCM } from "./audioUtils";

/**
 * Splits long text into chunks.
 * Uses a safe chunk size of 2500 characters to balance API latency and safety.
 * Handles newlines as delimiters and hard-splits extremely long sequences.
 */
const chunkText = (text: string, maxChunkSize: number = 2500): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";
  
  // Split by sentence terminators (. ! ? \n) followed by whitespace or end of string.
  // Including \n helps break down scripts that use line breaks instead of punctuation.
  const regex = /[^.!?\n]+[.!?\n]+(\s+|$)|[^.!?\n]+$/g;
  const sentences = text.match(regex) || [text];

  for (const sentence of sentences) {
    // If adding this sentence exceeds the max size
    if ((currentChunk + sentence).length > maxChunkSize) {
      // 1. Push the current accumulation if it exists
      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // 2. Handle the specific sentence
      if (sentence.length > maxChunkSize) {
        // If the single sentence is huge (e.g. no punctuation), hard split it
        let temp = sentence;
        while (temp.length > 0) {
           // Take as much as we can (up to maxChunkSize)
           const sliceLen = Math.min(temp.length, maxChunkSize);
           const slice = temp.slice(0, sliceLen);
           
           // If it's a full chunk's worth, push immediately
           if (slice.length === maxChunkSize) {
               chunks.push(slice);
           } else {
               // If it's the remainder, start a new currentChunk
               currentChunk = slice;
           }
           temp = temp.slice(sliceLen);
        }
      } else {
        // Standard case: sentence fits in a fresh chunk
        currentChunk = sentence;
      }
    } else {
      // Fits in current chunk
      currentChunk += sentence;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

// Retry helper for robust long-form generation
async function generateChunkWithRetry(
  ai: GoogleGenAI, 
  prompt: string, 
  config: any, 
  retries = 3
): Promise<Uint8Array> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: config,
      });

      const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        return decodeBase64PCM(b64);
      }
      throw new Error("No audio data in response");
    } catch (err) {
      console.warn(`Chunk generation attempt ${i + 1} failed:`, err);
      if (i === retries - 1) throw err;
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Failed to generate chunk after retries");
}

export const generateSpeech = async (
  text: string,
  voiceName: VoiceName,
  emotionIntensity: number, // 0 to 100
  onProgress?: (current: number, total: number) => void
): Promise<Uint8Array> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });

  // Handle Voice Mapping
  let targetVoiceName = voiceName;
  let languageInstruction = "";

  if (voiceName === VoiceName.Kore_Hindi) {
    targetVoiceName = VoiceName.Kore;
    languageInstruction = " in Hindi";
  } else if (voiceName === VoiceName.Original) {
    targetVoiceName = VoiceName.Kore;
  }

  const isMixMode = voiceName === VoiceName.Mix;
  const isRealMixMode = voiceName === VoiceName.Real_Mix;

  // Style Description
  let styleDescription = "";
  if (emotionIntensity < 20) {
    styleDescription = "very calm, soothing, almost whispered and slow monotone";
  } else if (emotionIntensity < 40) {
    styleDescription = "relaxed, neutral, and steady";
  } else if (emotionIntensity < 60) {
    styleDescription = "friendly, conversational, and engaging";
  } else if (emotionIntensity < 85) {
    styleDescription = "energetic, enthusiastic, and bright";
  } else {
    styleDescription = "extremely excited, loud, fast-paced, and ecstatic! High energy!";
  }

  // Configure Speech Config
  let speechConfig: any;

  if (isMixMode) {
    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          { speaker: 'A', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } } },
          { speaker: 'B', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }
        ]
      }
    };
  } else if (isRealMixMode) {
    speechConfig = {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: [
          // Using Charon (Deep) and Kore (Standard) for a grounded, realistic mix
          { speaker: 'A', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
          { speaker: 'B', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        ]
      }
    };
  } else {
    speechConfig = {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: targetVoiceName as any },
      },
    };
  }

  const textChunks = chunkText(text, 2500); // 2500 char chunks
  const audioParts: Uint8Array[] = [];
  let totalLength = 0;

  console.log(`Starting generation for ${textChunks.length} chunks...`);
  if (onProgress) onProgress(0, textChunks.length);

  for (let i = 0; i < textChunks.length; i++) {
    const chunk = textChunks[i];
    let promptText = "";

    if (isMixMode) {
      promptText = `Narrate the following part ${i + 1}/${textChunks.length} of the text as a dynamic duo. Tone: ${styleDescription}. Text: "${chunk}"`;
    } else if (isRealMixMode) {
      // Prompt engineered for hyper-realism
      promptText = `Generate a hyper-realistic, natural conversation for part ${i + 1}/${textChunks.length}. The voices should sound like real people talking, not reading. Use natural prosody. Tone: ${styleDescription}. Text: "${chunk}"`;
    } else if (voiceName === VoiceName.Original) {
      promptText = `Speak part ${i + 1}/${textChunks.length} in an ultra-realistic, natural human voice. Tone: ${styleDescription}. Text: "${chunk}"`;
    } else {
      promptText = `Say the following${languageInstruction} in a ${styleDescription} voice: "${chunk}"`;
    }

    const config = {
      responseModalities: [Modality.AUDIO],
      speechConfig: speechConfig,
    };

    const pcm = await generateChunkWithRetry(ai, promptText, config);
    audioParts.push(pcm);
    totalLength += pcm.length;
    
    // Update progress
    if (onProgress) onProgress(i + 1, textChunks.length);
  }

  // Concatenate all parts
  if (totalLength === 0) throw new Error("No audio generated.");

  const finalBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of audioParts) {
    finalBuffer.set(part, offset);
    offset += part.length;
  }

  return finalBuffer;
};