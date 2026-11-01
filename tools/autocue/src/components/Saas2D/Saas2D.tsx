//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

import holds from '../../../showcase/echo3d/voice/holds-fry-short.json';
import { type CardPrim, LAYERS, type Prim, frameAt, place } from './engine.ts';
import { loadNeuFonts } from './fonts.ts';
import { slides } from './slides.ts';
import { Background, Card, Defs, HEIGHT, SvgPrim, WIDTH } from './theme.tsx';

loadNeuFonts();

/** The timeline's length, for the composition's duration. */
export const SAAS2D_SECONDS = Object.values(holds).reduce((sum, hold) => sum + hold, 0);

const isCard = (prim: Prim): prim is CardPrim => prim.kind === 'card';

/** The SaaS story in neu-dark 2D, timed to the short Fry cut of the echo3d presentation. */
export const Saas2D = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const timeline = useMemo(() => place(slides(holds), holds), []);
  const { camera, prims } = frameAt(timeline, frame / fps);
  const visible = prims.filter((prim) => (prim.opacity ?? 1) > 0.002);
  const ordered = LAYERS.flatMap((kind) => visible.filter((prim) => prim.kind === kind));
  return (
    <AbsoluteFill>
      <Background />
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute', inset: 0 }}>
        <Defs />
        {ordered.map((prim) => (
          <SvgPrim key={`${prim.kind}:${prim.id}`} prim={prim} camera={camera} />
        ))}
      </svg>
      {visible.filter(isCard).map((prim) => (
        <Card key={prim.id} prim={prim} />
      ))}
    </AbsoluteFill>
  );
};
