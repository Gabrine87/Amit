import React from 'react';
import { VoiceName, VoiceProfile } from '../types';
import { Play, Check } from 'lucide-react';

interface AccentCarouselProps {
  selectedVoice: VoiceName;
  onSelect: (voice: VoiceName) => void;
  onPreview: (voice: VoiceName) => void;
}

const VOICES: VoiceProfile[] = [
  { name: VoiceName.Original, label: 'Original Human', flag: '👤', gender: 'Female', description: 'Raw & Lifelike' },
  { name: VoiceName.Real_Mix, label: 'Real Human Mix', flag: '👥', gender: 'Mix', description: 'Hyper-Realistic Chat' },
  { name: VoiceName.Kore, label: 'US - Kore', flag: '🇺🇸', gender: 'Female', description: 'Relaxed & Smooth' },
  { name: VoiceName.Fenrir, label: 'UK - Fenrir', flag: '🇬🇧', gender: 'Male', description: 'Deep & Authoritative' },
  { name: VoiceName.Kore_Hindi, label: 'IN - Kore', flag: '🇮🇳', gender: 'Female', description: 'Hindi • Cultural' },
  { name: VoiceName.Mix, label: 'Duo Mix', flag: '🎭', gender: 'Mix', description: 'Dynamic Multi-Speaker' },
  { name: VoiceName.Puck, label: 'AU - Puck', flag: '🇦🇺', gender: 'Male', description: 'Playful & Sharp' },
  { name: VoiceName.Charon, label: 'US - Charon', flag: '🇺🇸', gender: 'Male', description: 'Deep & Storyteller' },
  { name: VoiceName.Zephyr, label: 'US - Zephyr', flag: '🇺🇸', gender: 'Female', description: 'Soft & Airy' },
];

export const AccentCarousel: React.FC<AccentCarouselProps> = ({ selectedVoice, onSelect, onPreview }) => {
  return (
    <div className="w-full overflow-hidden">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-3">Accent & Language Preview</h3>
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {VOICES.map((voice) => (
                <div 
                    key={voice.name}
                    onClick={() => onSelect(voice.name)}
                    className={`
                        flex-shrink-0 w-40 p-4 rounded-xl cursor-pointer transition-all duration-300 snap-start
                        border relative group
                        ${selectedVoice === voice.name 
                            ? 'bg-cyber-800 border-cyber-300 shadow-[0_0_15px_rgba(102,252,241,0.3)]' 
                            : 'bg-cyber-900 border-cyber-700 hover:border-cyber-500'}
                    `}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-3xl filter drop-shadow-lg">{voice.flag}</span>
                        {selectedVoice === voice.name && <Check className="w-5 h-5 text-cyber-300" />}
                    </div>
                    
                    <div className="mb-3">
                        <h4 className="font-bold text-white text-sm">{voice.label}</h4>
                        <p className="text-xs text-gray-400">{voice.gender} • {voice.description}</p>
                    </div>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onPreview(voice.name); }}
                        className="w-full flex items-center justify-center py-2 bg-cyber-700 hover:bg-cyber-600 rounded-lg transition-colors text-xs font-bold uppercase tracking-wide text-white group-hover:bg-cyber-500"
                    >
                        <Play className="w-3 h-3 mr-1 fill-current" /> Preview
                    </button>
                </div>
            ))}
        </div>
    </div>
  );
};