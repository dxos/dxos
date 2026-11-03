//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';
import { AbsoluteFill, type CalculateMetadataFunction, useCurrentFrame, useVideoConfig } from 'remotion';

import holds from '../../../showcase/echo3d/voice/holds-fry-short.json';
import { Captions } from './captions.tsx';
import { type CardPrim, LAYERS, type Placed, type Prim, type Slide, TRANSITION, frameAt, place } from './engine.ts';
import { loadNeuFonts } from './fonts.ts';
import { slides } from './slides.ts';
import { Background, Card, Defs, Grain, HEIGHT, SvgPrim, WIDTH } from './theme.tsx';

loadNeuFonts();

/** Scenes given their own length, since their motion reads badly when sped up to an equal share. */
const FIXED: Record<string, number> = {
  'frontier-comms': 7,
  'absorb': 9,
  'merge-1': 8,
  'saas-merge': 8,
  'company-fills': 12,
};

/**
 * Each scene's length in the voiced cut, which its keyframes are timed for; company-fills plays at the pace it had in
 * 9 s and holds its last frame for the 3 s after.
 */
const AUTHORED: Record<string, number> = { ...holds, 'company-fills': (7 * 12) / 9 };

/** The story's length; every scene gets an equal share of it. */
export const SAAS2D_SECONDS = 93;

/** Equal holds for every other scene; each plays its choreography, timed by the voice-over's holds, sped up to fit. */
const UNIFORM: Record<string, number> = (() => {
  const ids = Object.keys(AUTHORED);
  const fixed = Object.values(FIXED).reduce((sum, hold) => sum + hold, 0);
  const share = (SAAS2D_SECONDS - fixed) / (ids.length - Object.keys(FIXED).length);
  return Object.fromEntries(ids.map((id) => [id, FIXED[id] ?? share]));
})();

/** A morph takes at most this share of its scene, so every scene also rests on its own layout. */
const MORPH_SHARE = 0.6;

/** `slide` played in `seconds` instead of the `authored` seconds its keyframes were timed for. */
const fit = (slide: Slide, authored: number, seconds: number): Slide => ({
  ...slide,
  draw: (t) => slide.draw((t * authored) / seconds, t),
  transition: Math.min(slide.transition ?? TRANSITION, seconds * MORPH_SHARE),
});

const isCard = (prim: Prim): prim is CardPrim => prim.kind === 'card';

export type Saas2DProps = {
  /** Plays only these slides, with these holds (seconds), instead of the whole story: a test of one transition. */
  test?: Record<string, number>;
  /** Flat shapes with the current scene and time over them: no filters or grain, so a render to review motion is fast. */
  draft?: boolean;
  /** The current scene and time over every frame, so notes on a render can name the moment they mean. */
  clock?: boolean;
  /** The chapter chip top left and a subtitle under each scene. */
  captions?: boolean;
};

/** The opening of the story up to the spread, short holds around its cuts: a test of those transitions. */
export const MORPH_TEST: Record<string, number> = {
  'beginning': 2.5,
  'silo': 3.5,
  'silo-comms': 3,
  'scale': 4,
  'competitors': 3,
  'spread': 5,
};

/** Sizes a composition to the slides it plays; a draft runs at 30 fps, which is enough to judge motion. */
export const saas2dMetadata: CalculateMetadataFunction<Saas2DProps> = ({ props }) => {
  const fps = props.draft ? 30 : 60;
  const seconds = Object.values(props.test ?? UNIFORM).reduce((sum, hold) => sum + hold, 0);
  return { fps, durationInFrames: Math.round(seconds * fps) };
};

/** The scene playing and the time, in the story and in the scene. */
const Clock = ({ timeline, seconds }: { timeline: Placed[]; seconds: number }) => {
  const current = timeline.findLast((placed) => placed.start <= seconds) ?? timeline[0];
  return (
    <div
      style={{
        position: 'absolute',
        left: 24,
        bottom: 16,
        font: '500 28px monospace',
        color: '#fff',
        opacity: 0.8,
        textShadow: '0 0 4px #000',
      }}
    >
      {seconds.toFixed(2)}s · {current.slide.id} +{(seconds - current.start).toFixed(2)}s
    </div>
  );
};

/** The SaaS story in neu-dark 2D, timed to the short Fry cut of the echo3d presentation. */
export const Saas2D = ({ test, draft, clock, captions }: Saas2DProps) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const timeline = useMemo(() => {
    const timing = test ?? UNIFORM;
    return place(
      slides(AUTHORED)
        .filter((slide) => slide.id in timing)
        .map((slide) => fit(slide, AUTHORED[slide.id], timing[slide.id])),
      timing,
    );
  }, [test]);
  const seconds = frame / fps;
  const { camera, prims } = frameAt(timeline, seconds);
  const visible = prims.filter((prim) => (prim.opacity ?? 1) > 0.002);
  const ordered = LAYERS.flatMap((kind) => visible.filter((prim) => prim.kind === kind));
  return (
    <AbsoluteFill>
      <Background />
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ position: 'absolute', inset: 0 }}>
        <Defs />
        {/* The CSS property overrides every `filter` attribute, which is where nearly all of a frame's render time goes. */}
        {draft && <style>{'* { filter: none !important; } .nd-body { stroke: #5a6070; stroke-width: 1.5px; }'}</style>}
        {ordered.map((prim) => (
          <SvgPrim key={`${prim.kind}:${prim.id}`} prim={prim} camera={camera} />
        ))}
      </svg>
      {visible.filter(isCard).map((prim) => (
        <Card key={prim.id} prim={prim} />
      ))}
      {captions && <Captions timeline={timeline} seconds={seconds} total={durationInFrames / fps} />}
      {!draft && <Grain />}
      {(draft || clock) && <Clock timeline={timeline} seconds={seconds} />}
    </AbsoluteFill>
  );
};
