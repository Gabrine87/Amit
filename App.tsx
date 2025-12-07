import React, { useState, useRef, useEffect } from 'react';
import { AudioEffects, VoiceName } from './types';
import { EmotionDial } from './components/EmotionDial';
import { AccentCarousel } from './components/AccentCarousel';
import { VoiceMorpher } from './components/VoiceMorpher';
import { Avatar } from './components/Avatar';
import { generateSpeech } from './services/geminiService';
import { pcmToAudioBuffer, createReverbImpulse, audioBufferToWav } from './services/audioUtils';
import { Wand2, AlertCircle, Volume2, PlayCircle, StopCircle, Download, Clock, FileEdit, Loader2 } from 'lucide-react';

const DEFAULT_TEXT = "Welcome to Sonic Gen AI. I can change my emotion, accent, and even morph my voice in real time.";

function App() {
  // State
  const [text, setText] = useState(DEFAULT_TEXT);
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Kore);
  const [emotion, setEmotion] = useState<number>(50);
  const [effects, setEffects] = useState<AudioEffects>({ echo: false, reverb: false, radio: false });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{current: number, total: number} | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [fileName, setFileName] = useState("sonicgen-audio");

  // Refs for Audio Engine
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Stop Audio
  const stopAudio = () => {
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) { /* ignore if already stopped */ }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setIsPlaying(false);
  };

  // Apply Effects and Play
  const playBuffer = async (buffer: AudioBuffer) => {
    stopAudio();
    const ctx = initAudio();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    sourceRef.current = source;

    // Create Effect Nodes
    const masterGain = ctx.createGain();
    masterGain.gain.value = 1.0;
    gainNodeRef.current = masterGain;

    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    setAnalyser(analyserNode);

    // Chain construction
    let lastNode: AudioNode = source;

    // 1. Radio Effect (Filter + Distortion)
    if (effects.radio) {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 3000;
      
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 500;
      
      const distortion = ctx.createWaveShaper();
      // Simple hard clip curve
      const curve = new Float32Array(44100);
      for(let i=0;i<44100;i++) {
        const x = (i * 2) / 44100 - 1;
        curve[i] = Math.tanh(x * 2); // Soft clip
      }
      distortion.curve = curve;

      lastNode.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(distortion);
      lastNode = distortion;
    }

    // 2. Echo (Delay + Feedback)
    if (effects.echo) {
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.3;
      
      const feedback = ctx.createGain();
      feedback.gain.value = 0.4;
      
      // Connect Delay path to Master directly (Parallel)
      lastNode.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay); // Loop
      delay.connect(masterGain); 
    }

    // 3. Reverb (Convolver)
    if (effects.reverb) {
      const convolver = ctx.createConvolver();
      convolver.buffer = createReverbImpulse(ctx, 1.5, 2.0);
      const reverbGain = ctx.createGain();
      reverbGain.gain.value = 0.6;
      
      lastNode.connect(convolver);
      convolver.connect(reverbGain);
      reverbGain.connect(masterGain);
    }

    // Connect Main Dry Path
    lastNode.connect(masterGain);
    
    // Final Chain
    masterGain.connect(analyserNode);
    analyserNode.connect(ctx.destination);

    source.onended = () => setIsPlaying(false);
    source.start();
    setIsPlaying(true);
  };

  const handleGenerate = async () => {
    if (!process.env.API_KEY) {
      setError("API Key missing in environment variables.");
      return;
    }

    setIsGenerating(true);
    setProgress({ current: 0, total: 0 });
    setError(null);
    stopAudio();

    try {
      // Returns Uint8Array (stitched chunks) with progress callback
      const rawBytes = await generateSpeech(
        text, 
        voice, 
        emotion, 
        (current, total) => setProgress({ current, total })
      );
      
      const ctx = initAudio();
      const audioBuffer = pcmToAudioBuffer(rawBytes, ctx);
      audioBufferRef.current = audioBuffer;
      
      playBuffer(audioBuffer);
    } catch (err: any) {
      setError(err.message || "Failed to generate speech.");
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  // Re-play if effects change while playing
  const handleReplay = () => {
    if (audioBufferRef.current) {
      playBuffer(audioBufferRef.current);
    }
  };

  const handleDownload = () => {
    if (!audioBufferRef.current) return;
    
    const blob = audioBufferToWav(audioBufferRef.current);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Sanitize filename
    const safeName = fileName.replace(/[^a-z0-9-_]/gi, '_') || `sonicgen-${new Date().getTime()}`;
    a.download = `${safeName}.wav`;
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-cyber-900 text-white p-4 md:p-8 font-sans selection:bg-cyber-500 selection:text-black">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header */}
        <div className="lg:col-span-12 flex flex-wrap items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyber-500 to-cyber-300 flex items-center justify-center shadow-lg shadow-cyber-500/20">
              <Volume2 className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">SonicGen AI</h1>
              <p className="text-xs text-cyber-500 font-mono tracking-wider">GEMINI 2.5 ENGINE ACTIVE</p>
            </div>
          </div>
           
           <div className="flex items-center gap-3">
             {/* Long Audio Badge */}
             <div className="hidden sm:flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold border border-cyber-700 bg-cyber-900 text-gray-400 tracking-wider">
                <Clock className="w-3 h-3" />
                LONG VOICE ENABLED (30m+)
             </div>

             {/* Status Indicator */}
             <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${isGenerating ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : isPlaying ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-gray-700 text-gray-500'}`}>
               <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-yellow-500 animate-pulse' : isPlaying ? 'bg-green-500 animate-ping' : 'bg-gray-500'}`}></div>
               {isGenerating 
                 ? progress?.total 
                   ? `GENERATING CHUNK ${progress.current}/${progress.total}` 
                   : 'PROCESSING' 
                 : isPlaying ? 'PLAYING' : 'READY'}
             </div>
           </div>
        </div>

        {/* Left Column: Controls */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Emotion Dial */}
          <EmotionDial value={emotion} onChange={setEmotion} />

          {/* Voice Morpher */}
          <VoiceMorpher effects={effects} onChange={setEffects} />
          
          {/* Text Input */}
          <div className="bg-cyber-800 p-4 rounded-2xl border border-cyber-700">
             <div className="flex justify-between items-center mb-2">
                <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Script</h3>
                <span className="text-[10px] text-gray-600 font-mono">Auto-Chunking Active</span>
             </div>
             <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full bg-cyber-900 border border-cyber-700 rounded-xl p-3 text-sm text-gray-200 focus:border-cyber-500 focus:ring-1 focus:ring-cyber-500 outline-none resize-none h-32 transition-all"
                placeholder="Enter text to synthesize (Supports long documents)..."
             />
          </div>

          {/* Generate Button */}
          <button 
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`
              w-full py-4 rounded-xl font-bold text-black text-lg tracking-wide shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
              ${isGenerating 
                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-cyber-400 to-cyber-300 hover:from-cyber-300 hover:to-white shadow-cyber-500/30'}
            `}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin w-5 h-5" /> 
                {progress?.total ? `Generating (${Math.round((progress.current/progress.total)*100)}%)` : "Synthesizing..."}
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" /> GENERATE AUDIO
              </>
            )}
          </button>

           {error && (
            <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start gap-2 text-red-200 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

        </div>

        {/* Right Column: Visuals & Output */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          
          {/* Avatar Visualizer */}
          <Avatar analyser={analyser} isPlaying={isPlaying} />

          {/* Carousel */}
          <AccentCarousel 
            selectedVoice={voice} 
            onSelect={setVoice}
            onPreview={(v) => {
                setVoice(v);
            }}
          />

          {/* Playback Controls Area */}
          <div className="bg-cyber-800 p-6 rounded-2xl border border-cyber-700 flex-grow flex flex-col justify-center items-center relative overflow-hidden min-h-[200px]">
             <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
             
             {audioBufferRef.current ? (
               <div className="flex flex-col items-center gap-6 z-10 w-full max-w-md">
                 <div className="flex items-center gap-8">
                    <button 
                      onClick={isPlaying ? stopAudio : handleReplay}
                      className="w-20 h-20 rounded-full bg-cyber-500 hover:bg-cyber-400 text-black flex items-center justify-center transition-all shadow-[0_0_30px_rgba(78,204,163,0.4)] hover:scale-105"
                    >
                      {isPlaying ? <StopCircle className="w-10 h-10 fill-current" /> : <PlayCircle className="w-10 h-10 fill-current" />}
                    </button>
                    
                    <div className="flex flex-col gap-2">
                      <label className="text-xs text-cyber-300 uppercase tracking-wider font-semibold">Save As</label>
                      <div className="flex items-center gap-2 bg-cyber-900 p-1 rounded-xl border border-cyber-600 focus-within:border-cyber-400 transition-colors">
                        <div className="relative">
                          <input 
                            type="text" 
                            value={fileName}
                            onChange={(e) => setFileName(e.target.value)}
                            className="bg-transparent border-none rounded-lg py-2 pl-3 pr-8 text-sm text-white placeholder-gray-600 focus:ring-0 w-40"
                            placeholder="filename"
                          />
                          <FileEdit className="w-3 h-3 text-gray-500 absolute right-2 top-3" />
                        </div>
                        <button
                          onClick={handleDownload}
                          className="w-10 h-10 rounded-lg bg-cyber-700 hover:bg-cyber-600 text-cyber-300 flex items-center justify-center transition-all hover:text-white"
                          title="Download WAV"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                 </div>
                 <p className="text-cyber-300 font-mono text-sm">
                    {Math.round(audioBufferRef.current.duration)}s Sequence Ready
                 </p>
               </div>
             ) : (
               <div className="text-center text-gray-500 z-10">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Enter text to generate (Long duration supported)</p>
               </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;