//
// Copyright 2025 David Haz
// Copyright 2025 DXOS.org

import React, { type CSSProperties, forwardRef, useImperativeHandle, useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type GhostController, type GhostProps, useGhost, useGhostController } from './ghost-renderer';

export const Ghost = forwardRef<GhostController, Partial<GhostProps>>(
  ({ classNames, frame, ...props }, forwardedRef) => {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const ghost = useGhost(canvas, props);
    useGhostController(ghost, props);

    useImperativeHandle(
      forwardedRef,
      () => ({
        move: (x: number, y: number) => ghost?.move(x, y),
        splatAt: (x: number, y: number) => ghost?.splatAt(x, y),
      }),
      [ghost],
    );

    const frameStyle: CSSProperties | undefined = frame
      ? {
          // Layer 1 (source) = center hole, layer 2 (backdrop) = full canvas.
          // Standard `exclude` (XOR): shows pixels covered by exactly one layer = border ring.
          // Webkit `destination-out`: shows backdrop (full) only where source (center) is absent = border ring.
          maskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          maskSize: `calc(100% - ${frame * 2}px) calc(100% - ${frame * 2}px), 100% 100%`,
          maskPosition: 'center, 0 0',
          maskRepeat: 'no-repeat',
          maskComposite: 'exclude',
          WebkitMaskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
          WebkitMaskSize: `calc(100% - ${frame * 2}px) calc(100% - ${frame * 2}px), 100% 100%`,
          WebkitMaskPosition: 'center, 0 0',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskComposite: 'destination-out',
        }
      : undefined;

    return <canvas ref={setCanvas} className={mx('dx-fill', classNames)} style={frameStyle} />;
  },
);
