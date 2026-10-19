//
// Copyright 2026 DXOS.org
//

import { Player, type PlayerRef } from '@remotion/player';
import React, { type ComponentType, useEffect, useRef } from 'react';

import { FPS } from './brand.ts';
import { type IdentProps, palette } from './theme.tsx';

export type IdentPlayerProps<P extends object> = {
  component: ComponentType<P & IdentProps>;
  /** The composition's props besides the palette's (e.g. a provocation's id); `{}` for a card with none. */
  inputProps: P;
  seconds: number;
  width: number;
  height: number;
  /** Plays once and calls this at the end; unset, the card loops. */
  onEnded?: () => void;
} & IdentProps;

/** One ident card in Remotion's `Player`, at a recording's size, letterboxed like the Frame. */
export const IdentPlayer = <P extends object>({
  component,
  inputProps,
  seconds,
  width,
  height,
  onEnded,
  theme,
  logoColor,
}: IdentPlayerProps<P>) => {
  const ref = useRef<PlayerRef>(null);
  useEffect(() => {
    const player = ref.current;
    if (!player) {
      return;
    }

    if (onEnded) {
      player.addEventListener('ended', onEnded);
    }
    player.play();
    return () => {
      if (onEnded) {
        player.removeEventListener('ended', onEnded);
      }
    };
  }, [onEnded]);

  return (
    <div className='dx-fill' style={{ backgroundColor: palette({ theme }).letterbox }}>
      <Player
        ref={ref}
        component={component}
        inputProps={{ ...inputProps, theme, logoColor }}
        durationInFrames={Math.round(seconds * FPS)}
        fps={FPS}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: '100%', height: '100%' }}
        loop={!onEnded}
        // Muted, since a browser refuses to autoplay sound; the rendered ident keeps its audio.
        initiallyMuted
        acknowledgeRemotionLicense
      />
    </div>
  );
};
