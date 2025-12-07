export enum VoiceName {
  Kore = 'Kore',
  Puck = 'Puck',
  Charon = 'Charon',
  Fenrir = 'Fenrir',
  Zephyr = 'Zephyr',
  Kore_Hindi = 'Kore_Hindi',
  Mix = 'Mix',
  Original = 'Original',
  Real_Mix = 'Real_Mix'
}

export interface VoiceProfile {
  name: VoiceName;
  label: string;
  flag: string; // Emoji flag for demo purposes
  gender: 'Male' | 'Female' | 'Mix';
  description: string;
}

export interface AudioEffects {
  echo: boolean;
  reverb: boolean;
  radio: boolean;
}

export interface GenerationState {
  isGenerating: boolean;
  isPlaying: boolean;
  error: string | null;
}