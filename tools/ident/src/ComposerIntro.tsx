//
// Copyright 2026 DXOS.org
//

import poiretOne from '@fontsource/poiret-one/files/poiret-one-latin-400-normal.woff2';
import { loadFont } from '@remotion/fonts';
import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { type ComposerRing, composerRingPaths } from '@dxos/brand';

import { COLORS, TIMING } from './brand.ts';

/**
 * What the Turn ident adds to each ring of `composerRingPaths` (innermost first): its transform's x scale, to convert
 * arm travel into viewBox units, and its bottom-arm vertices paired with their mirror of the top arm, so the mark can
 * start symmetric (the bottom arms of the real mark are longer).
 */
const TURN_RINGS: { scaleX: number; arms: [real: string, symmetric: string][] }[] = [
  {
    scaleX: 0.969697,
    arms: [
      ['761.579,164', '729.238,164'],
      ['769.5,140', '721.317,140'],
    ],
  },
  {
    scaleX: 0.969697 * 0.917198,
    arms: [
      ['1065.83,1064', '1047.85,1064'],
      ['1074.47,1040', '1039.21,1040'],
    ],
  },
  {
    scaleX: 0.969697,
    arms: [
      ['745.738,212', '745.079,212'],
      ['753.659,188', '737.159,188'],
    ],
  },
  {
    scaleX: 0.969697 * 1.03125,
    arms: [
      ['152.958,212', '152.319,212'],
      ['145.277,236', '160,236'],
    ],
  },
];

type Ring = ComposerRing & (typeof TURN_RINGS)[number];

const RINGS: Ring[] = composerRingPaths.map((ring, index) => ({ ...ring, ...TURN_RINGS[index] }));

/**
 * The "Turn" ident (ComposerIdent story, dxos/dxos#13872): every ring spins in and stops at the same moment, inner
 * rings turning further, while the bottom arms grow from the symmetric mark; the wordmark fades in as they settle.
 */
const TURN = {
  duration: 2000,
  easing: Easing.bezier(0.25, 1, 0.5, 1),
  /** Arms grow at this rate (viewBox units per ms) and are fully grown at this fraction of the spin. */
  growRate: 0.1,
  growFinishAt: 0.55,
  /** The wordmark may start once the spin looks settled, plus a short gap. */
  settledAt: 0.6,
  wordmarkDelay: 100,
  wordmarkFade: 1200,
};

const WORDMARK_FAMILY = 'Poiret One';
/** Wordmark size and offset from the mark, in viewBox units (the mark is 256 square). */
const WORDMARK_SIZE = 150;
const WORDMARK_X = 216;

const fontLoaded = loadFont({ family: WORDMARK_FAMILY, url: poiretOne, weight: '400' });

/** Baseline that centres the "c" on the mark, and the wordmark's width, measured once the font has loaded. */
const useWordmarkMetrics = () => {
  const [metrics, setMetrics] = useState<{ baseline: number; width: number }>();
  const [handle] = useState(() => delayRender('Measuring the Composer wordmark'));
  useEffect(() => {
    void fontLoaded.then(() => {
      const context = document.createElement('canvas').getContext('2d');
      if (context) {
        context.font = `${WORDMARK_SIZE}px "${WORDMARK_FAMILY}"`;
        const glyph = context.measureText('c');
        const centre = (glyph.actualBoundingBoxAscent - glyph.actualBoundingBoxDescent) / 2;
        setMetrics({ baseline: 128 + centre, width: context.measureText('composer').width });
      }
      continueRender(handle);
    });
  }, [handle]);
  return metrics;
};

/** The ring's path with each bottom-arm vertex `grown` (0-1) of the way from its symmetric position. */
const growPath = (ring: Ring, grown: number) =>
  ring.arms.reduce((path, [real, symmetric]) => {
    const [realX, y] = real.split(',').map(Number);
    const symmetricX = Number(symmetric.split(',')[0]);
    return path.replaceAll(real, `${symmetricX + (realX - symmetricX) * grown},${y}`);
  }, ring.d);

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const ComposerIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const metrics = useWordmarkMetrics();
  const ms = (frame / fps) * 1000;

  const spin = TURN.easing(Math.min(1, ms / TURN.duration));
  const growEnd = TURN.duration * TURN.growFinishAt;
  const wordmarkStart = TURN.duration * TURN.settledAt + TURN.wordmarkDelay;
  const wordmarkOpacity = interpolate(ms, [wordmarkStart, wordmarkStart + TURN.wordmarkFade], [0, 1], {
    ...clamp,
    easing: Easing.inOut(Easing.ease),
  });
  const fadeOut = interpolate(
    ms,
    [TIMING.composer.duration * 1000 - 400, TIMING.composer.duration * 1000],
    [1, 0],
    clamp,
  );

  // The lockup is sized to its final extent so nothing reflows while it animates.
  const viewWidth = metrics ? WORDMARK_X + metrics.width : 256;
  const markSize = Math.round(Math.min(width * 0.8 * (256 / viewWidth), height * 0.3));

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.ground, alignItems: 'center', justifyContent: 'center', opacity: fadeOut }}
    >
      <svg
        width={(markSize * viewWidth) / 256}
        height={markSize}
        viewBox={`0 0 ${viewWidth} 256`}
        style={{ overflow: 'visible' }}
      >
        {RINGS.map((ring, index) => {
          // Alternate directions, inner rings turning further, so neighbours move against each other.
          const turn = (index % 2 ? -1 : 1) * (1080 - index * 180);
          const longest = Math.max(
            ...ring.arms.map(([real, symmetric]) => Math.abs(parseFloat(real) - parseFloat(symmetric))),
          );
          const growDuration = (longest * ring.scaleX) / TURN.growRate;
          const grown = interpolate(ms, [growEnd - growDuration, growEnd], [0, 1], clamp);
          return (
            <g
              key={ring.fill}
              style={{
                opacity: Math.min(1, spin / 0.25),
                transform: `rotate(${turn * (1 - spin)}deg)`,
                transformBox: 'view-box',
                transformOrigin: '128px 128px',
              }}
            >
              <path transform={ring.transform} d={growPath(ring, grown)} style={{ fill: ring.fill }} />
            </g>
          );
        })}
        {metrics && (
          <text
            x={WORDMARK_X}
            y={metrics.baseline}
            fill={COLORS.main}
            fontFamily={`"${WORDMARK_FAMILY}", sans-serif`}
            fontSize={WORDMARK_SIZE}
            opacity={wordmarkOpacity}
          >
            composer
          </text>
        )}
      </svg>
    </AbsoluteFill>
  );
};
