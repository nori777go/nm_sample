'use client';

import { useEffect } from 'react';

export interface EffectsState {
  shake: boolean;
  flash: boolean;
  log: string;
  se: 'heart' | 'spark' | 'none';
  touchEvent: boolean;
}

function playBeep(type: 'heart' | 'spark' | 'none') {
  if (type === 'none' || typeof window === 'undefined') return;
  const audioContext = new AudioContext();
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = 'sine';
  osc.frequency.value = type === 'heart' ? 660 : 880;
  osc.connect(gain);
  gain.connect(audioContext.destination);
  gain.gain.value = 0.08;
  osc.start();
  osc.stop(audioContext.currentTime + 0.12);
}

export function EffectsLayer({ effect }: { effect: EffectsState }) {
  useEffect(() => {
    if (effect.touchEvent) {
      navigator.vibrate?.([60, 50, 80]);
    }
    playBeep(effect.se);
  }, [effect]);

  return (
    <div className={`effects-layer ${effect.shake ? 'shake' : ''} ${effect.flash ? 'flash' : ''}`}>
      <p className="effect-log">演出ログ: {effect.log || '—'}</p>
    </div>
  );
}
