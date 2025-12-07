import React, { useEffect, useRef } from 'react';

interface AvatarProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ analyser, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Store smoothed values for interpolation to prevent jitter
  const metricsRef = useRef({
    open: 0,
    spread: 0,
    wobble: 0
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (time: number) => {
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);

      // Visual Setup
      const centerX = width / 2;
      const centerY = height / 2;

      // --- Audio Analysis ---
      let targetOpen = 0;
      let targetSpread = 0;
      let energy = 0;

      // Declare variables in the outer scope of draw so they are available for the waveform visualization at the bottom
      let bufferLength = 0;
      let dataArray: Uint8Array | null = null;

      if (analyser && isPlaying) {
        bufferLength = analyser.frequencyBinCount; // 128 if fftSize is 256
        dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Band Analysis
        // Assuming 24kHz rate (Gemini TTS default), 128 bins -> ~93Hz per bin
        // Bass: 0-300Hz (Bins 0-3) - Fundamental pitch
        // Mids: 300Hz-3kHz (Bins 4-32) - Vowels/Formants
        // Highs: 3kHz+ (Bins 33-127) - Sibilance/Consonants (s, t, f, ch)
        
        let bassSum = 0;
        let midSum = 0;
        let highSum = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          if (i < 4) bassSum += val;
          else if (i < 32) midSum += val;
          else highSum += val;
        }

        const bassAvg = bassSum / 4;
        const midAvg = midSum / 28;
        const highAvg = highSum / 96;

        energy = (bassAvg + midAvg + highAvg) / 3;

        // Logic for Mouth Shape:
        // Openness is driven heavily by Mids (Vowels) and Bass (Power)
        // Spread is driven by Highs (Sss, Shh, Fff) relative to Mids
        
        // Normalize (0-255 range approx)
        const opennessInput = (midAvg * 1.5 + bassAvg * 0.5); 
        targetOpen = Math.min(1, Math.max(0, (opennessInput - 20) / 150)); // Threshold noise

        // Spread logic: If Highs are strong -> Spread (Smile/Grimace shape)
        // Typically Sibilance causes wide, narrow mouth.
        const spreadInput = highAvg * 2.0;
        targetSpread = Math.min(1, Math.max(0, (spreadInput - 20) / 100));
        
        // Heuristic: Reduce spread if mouth is very wide open (Open 'O' sounds usually not wide)
        if (targetOpen > 0.6) {
           targetSpread *= 0.5; 
        }
      }

      // --- Smoothing (Linear Interpolation) ---
      const smoothFactor = 0.25;
      metricsRef.current.open += (targetOpen - metricsRef.current.open) * smoothFactor;
      metricsRef.current.spread += (targetSpread - metricsRef.current.spread) * smoothFactor;
      
      // Idle animation wobble
      metricsRef.current.wobble = Math.sin(time * 0.002) * 2;

      const { open, spread, wobble } = metricsRef.current;
      
      // --- DRAWING ---
      
      // 1. Background Tech Circle
      ctx.strokeStyle = 'rgba(78, 204, 163, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
      ctx.stroke();
      
      // Rotating dashes
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(time * 0.0005);
      ctx.strokeStyle = 'rgba(102, 252, 241, 0.1)';
      ctx.setLineDash([20, 30]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 110, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // 2. Face Contour
      ctx.shadowColor = '#4ecca3';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#4ecca3';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      // Chin shape moves slightly with mouth
      const chinY = centerY + 70 + (open * 5); 
      ctx.moveTo(centerX - 60, centerY - 40 + wobble); // L Temple
      ctx.lineTo(centerX - 70, centerY + 10 + wobble); // L Cheek
      ctx.lineTo(centerX - 40, chinY); // L Chin
      ctx.lineTo(centerX + 40, chinY); // R Chin
      ctx.lineTo(centerX + 70, centerY + 10 + wobble); // R Cheek
      ctx.lineTo(centerX + 60, centerY - 40 + wobble); // R Temple
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 3. Eyes
      // Simple random blink
      const blink = Math.sin(time * 0.005 + Math.sin(time * 0.001)) > 0.98 ? 0.1 : 1; 
      const eyeY = centerY - 10 + wobble;
      
      ctx.fillStyle = '#66fcf1';
      ctx.shadowColor = '#66fcf1';
      ctx.shadowBlur = 15 + (energy * 0.1);
      
      // Left Eye
      ctx.beginPath();
      ctx.ellipse(centerX - 35, eyeY, 12, 5 * blink, 0, 0, Math.PI * 2);
      ctx.fill();

      // Right Eye
      ctx.beginPath();
      ctx.ellipse(centerX + 35, eyeY, 12, 5 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // 4. MOUTH (Complex Shape)
      // Parameters
      const mouthY = centerY + 35 + wobble;
      const baseWidth = 30;
      // Mouth gets wider with 'spread' (High Freq)
      const widthVar = baseWidth + (spread * 15); 
      // Mouth gets taller with 'open' (Mid/Low Freq)
      const heightVar = open * 35; 
      
      ctx.fillStyle = '#45a29e';
      ctx.strokeStyle = '#66fcf1';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      
      // 4 Control Points Logic
      // Left Corner
      const pLeft = { x: centerX - widthVar, y: mouthY };
      // Right Corner
      const pRight = { x: centerX + widthVar, y: mouthY };
      // Top Center (Cupid's bow area)
      // Moves up slightly when opening wide
      const pTop = { x: centerX, y: mouthY - 5 - (open * 5) }; 
      // Bottom Center
      // Moves down significantly
      const pBottom = { x: centerX, y: mouthY + heightVar };
      
      // Upper Lip Path
      ctx.moveTo(pLeft.x, pLeft.y);
      // Curve to top center
      ctx.quadraticCurveTo(centerX - (widthVar/2), pTop.y, pTop.x, pTop.y);
      ctx.quadraticCurveTo(centerX + (widthVar/2), pTop.y, pRight.x, pRight.y);
      
      // Lower Lip Path
      // Complex bezier for organic rounded shape
      // Control points depend on openness. 
      const bottomCPY = pBottom.y; 
      const bottomCPXOffset = widthVar * 0.6;
      
      ctx.bezierCurveTo(
          pRight.x - (widthVar * 0.2), pRight.y + (heightVar * 0.2), // CP1
          pBottom.x + bottomCPXOffset, bottomCPY, // CP2
          pBottom.x, pBottom.y // End
      );
      ctx.bezierCurveTo(
          pBottom.x - bottomCPXOffset, bottomCPY, // CP1
          pLeft.x + (widthVar * 0.2), pLeft.y + (heightVar * 0.2), // CP2
          pLeft.x, pLeft.y // End
      );

      ctx.fill();
      // Add a subtle stroke for definition
      ctx.stroke();
      
      // Internal mouth darkness (simulating oral cavity depth if open)
      if (open > 0.1) {
          ctx.fillStyle = '#0f0f1a';
          ctx.beginPath();
          ctx.moveTo(pLeft.x + 5, pLeft.y);
          ctx.quadraticCurveTo(centerX, pTop.y + 3, pRight.x - 5, pRight.y);
          ctx.quadraticCurveTo(centerX, pBottom.y - 3, pLeft.x + 5, pLeft.y);
          ctx.fill();
      }

      // 5. Voice Print / Waveform (Bottom overlay)
      if (isPlaying && analyser && dataArray) {
         ctx.strokeStyle = 'rgba(102, 252, 241, 0.4)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         const sliceWidth = width / bufferLength;
         let x = 0;
         // Draw a line visualizer at the bottom
         for(let i = 0; i < bufferLength; i++) {
             const v = dataArray[i] / 128.0;
             const y = height - (v * height * 0.2) - 10;
             if(i === 0) ctx.moveTo(x, y);
             else ctx.lineTo(x, y);
             x += sliceWidth * 2; // Skip some bins for clearer line
         }
         ctx.stroke();
      }

      animationRef.current = requestAnimationFrame((t) => draw(t));
    };

    animationRef.current = requestAnimationFrame((t) => draw(t));

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying]);

  return (
    <div className="relative w-full h-64 bg-cyber-900 rounded-2xl border border-cyber-700 overflow-hidden flex items-center justify-center shadow-inner group">
      <div className="absolute top-4 left-4 text-xs text-cyber-500 uppercase tracking-widest z-10 flex items-center gap-2">
         <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-cyber-500 animate-pulse' : 'bg-gray-600'}`}></span>
         Live Lip-Sync Analysis
      </div>
      
      {/* CRT Scanline Effect Overlay */}
      <div className="absolute inset-0 pointer-events-none z-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-20"></div>

      <canvas ref={canvasRef} width={400} height={300} className="w-full h-full object-cover" />
      
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-500">
          <div className="text-center">
             <span className="block text-cyber-300 text-sm font-mono animate-pulse tracking-widest mb-2">SYSTEM STANDBY</span>
             <span className="text-[10px] text-gray-500 uppercase">Awaiting Audio Stream</span>
          </div>
        </div>
      )}
    </div>
  );
};
