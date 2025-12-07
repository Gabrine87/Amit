import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Zap, Heart, Activity } from 'lucide-react';

interface EmotionDialProps {
  value: number;
  onChange: (value: number) => void;
}

export const EmotionDial: React.FC<EmotionDialProps> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dialRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging || !dialRef.current) return;

    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;

    const x = clientX - centerX;
    const y = clientY - centerY;

    // Calculate angle in radians, then degrees
    // atan2 returns -PI to PI. We want 0 to 360 starting from bottom-left roughly for a dial
    // Let's map: 0 degrees is South (bottom), clockwise.
    // Actually, let's do standard math angle and rotate the visual.
    
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    // Adjust so 135deg is 0% and 45deg is 100% (270 degree range)
    angle = angle + 90; // Shift so 0 is bottom
    if (angle < 0) angle += 360;

    // Constraints for a ~270 degree dial (Start at 135, End at 225 in standard coords)
    // Mapping logic:
    // Visual dial usually goes from ~7AM (calm) to ~5PM (excited)
    
    // Simplified: Map cursor height/width or simple rotation. 
    // Let's use a cleaner approach: Project point onto the circle arc.
    
    // Let's try a simple vertical drag or simple angle map for robustness.
    // We will assume the dial starts at -135deg and ends at +135deg (top is 0)
    
    // Re-calculating atan2 for standard Cartesian (0 is Right, -90 Top)
    let theta = Math.atan2(y, x) * (180 / Math.PI); 
    // Shift to make -90 (top) the center.
    let normalized = theta + 90; 
    if (normalized < 0) normalized += 360;
    
    // Normalized: Top is 0/360. Left is 270 (-90). Right is 90.
    // We want range from -135 (left-bottom) to 135 (right-bottom).
    
    // Let's map normalized 0-360 to linear 0-100.
    // It feels intuitive if dragging right increases value.
    
    // Robust approach: simply use the angle to fill the bar.
    // Let's assume 0 value is at 135 degrees (bottom left)
    // 100 value is at 405 degrees (bottom right)
    
    let deg = theta + 90; // 0 is bottom, -180 is top? No.
    // Atan2(y, x):
    // Right (1,0): 0
    // Bottom (0,1): 90
    // Left (-1,0): 180
    // Top (0,-1): -90
    
    // Desired:
    // 0% = 135 degrees (Bottom Left)
    // 50% = 270 degrees (Top) -> -90
    // 100% = 45 degrees (Bottom Right) -> which is 405
    
    let currentAngle = theta; 
    if (currentAngle < 135 && currentAngle >= -180) {
       // Right side or Top
       // Mapping is tricky with wrap around. 
       // Let's just use a simpler 'distance from start' metric or clamp.
    }

    // Fallback: use X/Y position relative to center to drive value roughly.
    // Wait, standard dial logic:
    
    const degrees = (Math.atan2(y, x) * 180) / Math.PI + 90; // 0 at bottom, 180 at top
    // We want 0 at bottom-left (-something) to 100 at bottom-right.
    // Let's say active range is -135 to 135 relative to Top (-90 original).
    
    // Let's stick to a simpler implementation:
    // Drag up/right increases, down/left decreases.
    // OR Just detect angle from center.
    
    let actualAngle = Math.atan2(y, x) * (180 / Math.PI); // -180 to 180
    // Shift phase so 0 is at 6 o'clock (90 deg in atan2)
    // Atan2: 0=3oc, 90=6oc, 180=9oc, -90=12oc
    
    // We want start at 135deg (approx 4:30 on clock face if 0 is 12)
    // Let's convert to clock face degrees (0 is 12 o'clock)
    let clockDeg = actualAngle + 90; 
    // Atan2(0, -1) = -90. +90 = 0. (Top)
    // Atan2(1, 0) = 0. +90 = 90. (Right)
    // Atan2(0, 1) = 90. +90 = 180. (Bottom)
    // Atan2(-1, 0) = 180. +90 = 270. (Left)
    
    if (clockDeg < 0) clockDeg += 360;
    
    // Now 0 is Top. Range is roughly 40deg to 320deg?
    // Let's say valid range is 220 (7-ish) to 140 (5-ish).
    // So we want 220 -> 0% and 140 -> 100%. (Crossing 0).
    
    // Let's simpler: One touch drag logic.
    // Just use the SVG click interaction.
    
  }, [isDragging]);

  // Simplified interaction: Click and drag Y axis
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    
    const handleDrag = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      
      // Simple vertical drag for robustness
      const delta = centerY - clientY; // positive is up
      const sensitivity = 1.5;
      
      // We act as a relative slider based on previous value? 
      // No, let's do absolute calculation based on angle for that "Circular Dial" feel.
      
      const centerX = rect.left + rect.width / 2;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      
      const x = clientX - centerX;
      const y = clientY - centerY;
      
      // Atan2(y, x): 0 is Right. 
      // We want a gauge from South-West (-135 deg?) to South-East.
      
      // Let's rotate standard polar coords so the gap is at the bottom.
      // Standard: 0 is right.
      // Rotate + 90 => 0 is Bottom. 
      let theta = Math.atan2(y, x) + (Math.PI / 2); 
      // Now 0 is bottom (6 o'clock). 
      // Left (9 o'clock) is PI/2. Top is PI. Right is -PI/2 or 3PI/2.
      
      // We want 0 value at approx 0.8 PI (Left bottom)
      // 100 value at approx -0.8 PI (Right bottom)
      
      // Let's use degrees.
      let deg = (Math.atan2(y, x) * 180 / Math.PI) + 90; // +90 makes 0 at 6 o'clock.
      // Range:
      // 6 o'clock = 0
      // 9 o'clock = 90
      // 12 o'clock = 180
      // 3 o'clock = 270 or -90
      
      if (deg < 0) deg += 360; 
      // 0 (bottom) -> 90 (left) -> 180 (top) -> 270 (right) -> 360
      
      // Map:
      // 0% should be at ~45 deg (bottom left ish)? No, standard gauge is usually 225 deg total.
      // Start at 45 deg (Bottom-Left-ish in this rotated space? No let's look at SVG).
      
      // Let's rely on the visual SVG logic.
      // SVG usually starts 3 o'clock (0 deg).
      // We want the gap at the bottom.
      // So start angle 135, end angle 405.
      
      // Let's just solve the UX: 
      // Calculate angle from center.
      let angle = Math.atan2(y, x) * 180 / Math.PI;
      // -180 to 180.
      // -90 is top. 90 is bottom.
      // We want value to increase Clockwise.
      // Start point: Bottom Left (~135 deg). End point: Bottom Right (~45 deg).
      
      // Convert to 0-360 positive starting from South (90 deg)
      let mapDeg = angle - 90; 
      if (mapDeg < 0) mapDeg += 360;
      // Now: Bottom(90) -> 0. Left(180) -> 90. Top(-90) -> 180. Right(0) -> 270.
      
      // We want a gap at the bottom. 
      // Let's say valid range is 40 to 320.
      // 40 is slightly right of bottom. 320 is slightly left of bottom.
      // Wait, we want Clockwise increase.
      // So Start at 40 (Left of bottom? No, 40 is right of bottom).
      
      // Let's invert.
      // 0 is Top.
      let topRef = angle + 90; // -180..180 -> -90..270. 
      if (topRef < 0) topRef += 360;
      // Top is 0. Right is 90. Bottom is 180. Left is 270.
      
      // Dial Range: 
      // Start: 225 (Bottom Left) -> Value 0
      // End: 135 (Bottom Right) -> Value 100
      // This crosses 0/360, annoying for math.
      
      // Let's just simply clamp a normalized angle.
      // Let's say 0 degrees is Bottom Left (135 global).
      // Total Sweep: 270 degrees.
      
      let p = topRef; // 0 at top.
      // We want 0% at 225 deg. 
      // We want 100% at 135 deg? No that's counter clockwise.
      // We want 0% at 225 (7:30).
      // 50% at 0 (12:00) ??? No 225 + 135 = 360 (0).
      // So 225 -> 360/0 -> 135.
      
      let val = 0;
      if (p >= 225) {
        val = (p - 225);
      } else if (p <= 135) {
        val = (p + (360 - 225));
      } else {
        // Dead zone at bottom
        return; 
      }
      
      let percent = Math.min(100, Math.max(0, (val / 270) * 100));
      onChange(percent);
    };

    window.addEventListener('mousemove', handleDrag);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleDrag);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleDrag);
      window.removeEventListener('touchend', handleUp);
    }
  }, [isDragging, onChange]);

  // Visual calculation
  // Circle circumference
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * (c * 0.75); // 75% circle arc

  // Emotion Labels
  const getLabel = () => {
    if (value < 20) return "Zen Mode";
    if (value < 40) return "Relaxed";
    if (value < 60) return "Balanced";
    if (value < 80) return "Energetic";
    return "Hyper";
  };

  const getColor = () => {
    if (value < 40) return "text-cyber-300 stroke-cyber-300";
    if (value < 70) return "text-cyber-500 stroke-cyber-500";
    return "text-pink-500 stroke-pink-500";
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-cyber-800 rounded-2xl border border-cyber-700 shadow-lg w-full max-w-xs mx-auto relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyber-300 to-pink-500 opacity-20"></div>
      
      <div className="text-center mb-4">
        <h3 className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Live Emotion Dial</h3>
        <p className={`text-xl font-bold mt-1 transition-colors duration-300 ${getColor().split(' ')[0]}`}>
          {getLabel()}
        </p>
      </div>

      <div 
        ref={dialRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className="relative w-48 h-48 cursor-pointer active:scale-95 transition-transform duration-150"
      >
        {/* Background Track */}
        <svg className="w-full h-full transform rotate-[135deg]">
          <circle
            cx="50%"
            cy="50%"
            r={r}
            fill="none"
            stroke="#16213e"
            strokeWidth="8"
            strokeLinecap="round"
            className="w-full h-full"
            strokeDasharray={c}
            strokeDashoffset={c * 0.25} 
          />
          {/* Active Track */}
          <circle
            cx="50%"
            cy="50%"
            r={r}
            fill="none"
            className={`transition-all duration-75 ease-out ${getColor().split(' ')[1]}`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            filter="url(#glow)"
          />
           <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
        
        {/* Center Icon/Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {value > 70 ? <Zap className={`w-8 h-8 ${getColor().split(' ')[0]} animate-pulse`} /> : 
           value < 30 ? <Heart className={`w-8 h-8 ${getColor().split(' ')[0]}`} /> : 
           <Activity className={`w-8 h-8 ${getColor().split(' ')[0]}`} />}
          <span className="text-2xl font-bold text-white mt-2">{Math.round(value)}%</span>
        </div>
      </div>
      
      <div className="flex justify-between w-full px-6 mt-2 text-[10px] text-gray-500 uppercase tracking-wider">
        <span>Calm</span>
        <span>Excited</span>
      </div>
    </div>
  );
};
