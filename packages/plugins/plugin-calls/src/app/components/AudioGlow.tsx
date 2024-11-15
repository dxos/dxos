//
// Copyright 2024 DXOS.org
//

import React, { type FC, type ReactNode } from 'react';

import useAudioLevel from '../hooks/useAudioLevel';
import { cn } from '../utils/style';

interface AudioGlowProps {
  audioTrack?: MediaStreamTrack;
  children?: ReactNode;
  className?: string;
  type: 'text' | 'box';
}

export const AudioGlow: FC<AudioGlowProps> = ({ audioTrack, children, className, type }) => {
  const audioLevel = useAudioLevel(audioTrack);
  return (
    <span
      className={cn(
        type === 'text' ? 'orange-glow-text' : 'orange-glow-box',
        'opacity-[--opacity] transition-opacity',
        className,
      )}
      style={{ '--opacity': Math.min(1, audioLevel * 4) } as any}
      aria-hidden
    >
      {children}
    </span>
  );
};
