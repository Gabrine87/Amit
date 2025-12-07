import React from 'react';
import { AudioEffects } from '../types';
import { Mic2, Radio, Waves } from 'lucide-react';

interface VoiceMorpherProps {
  effects: AudioEffects;
  onChange: (effects: AudioEffects) => void;
}

export const VoiceMorpher: React.FC<VoiceMorpherProps> = ({ effects, onChange }) => {
  const toggleEffect = (key: keyof AudioEffects) => {
    onChange({ ...effects, [key]: !effects[key] });
  };

  return (
    <div className="bg-cyber-800 rounded-2xl p-4 border border-cyber-700 w-full">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold mb-4">Voice Morph Layers</h3>
      
      <div className="grid grid-cols-3 gap-3">
        {/* Echo */}
        <button
          onClick={() => toggleEffect('echo')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${effects.echo ? 'bg-cyber-700 border-cyber-300 text-cyber-300 shadow-[0_0_10px_rgba(102,252,241,0.2)]' : 'bg-transparent border-cyber-700 text-gray-500 hover:border-gray-500'}`}
        >
          <Waves className="w-6 h-6 mb-2" />
          <span className="text-xs font-bold">Echo</span>
        </button>

        {/* Reverb */}
        <button
          onClick={() => toggleEffect('reverb')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${effects.reverb ? 'bg-cyber-700 border-pink-400 text-pink-400 shadow-[0_0_10px_rgba(244,114,182,0.2)]' : 'bg-transparent border-cyber-700 text-gray-500 hover:border-gray-500'}`}
        >
          <Mic2 className="w-6 h-6 mb-2" />
          <span className="text-xs font-bold">Cinematic</span>
        </button>

        {/* Radio */}
        <button
          onClick={() => toggleEffect('radio')}
          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${effects.radio ? 'bg-cyber-700 border-yellow-400 text-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.2)]' : 'bg-transparent border-cyber-700 text-gray-500 hover:border-gray-500'}`}
        >
          <Radio className="w-6 h-6 mb-2" />
          <span className="text-xs font-bold">Radio</span>
        </button>
      </div>
    </div>
  );
};
