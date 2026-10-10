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

import { COLORS, TIMING } from './brand.ts';

// TODO(burdon): Import `composerRingPaths` from `@dxos/brand` once dxos/dxos#13872 lands.
const OUTER_TRANSFORM = 'matrix(0.969697,0,0,1,-570.182,0)';

type Ring = {
  /** Maps the path's source coordinates into the 256 x 256 viewBox. */
  transform: string;
  /** The transform's x scale, to convert arm travel into viewBox units. */
  scaleX: number;
  fill: string;
  d: string;
  /** Bottom-arm vertices paired with their mirror of the top arm, so the mark can start symmetric. */
  arms: [real: string, symmetric: string][];
};

/** The mark's four rings, innermost first; each transform maps the ring onto a 256 x 256 viewBox centred on (128, 128). */
const RINGS: Ring[] = [
  {
    transform: OUTER_TRANSFORM,
    scaleX: 0.969697,
    fill: 'rgb(6,197,253)',
    d: 'M761.579,164L720,164C699.51,164 682.875,147.869 682.875,128C682.875,108.452 698.942,92.543 718.969,92.014L718.969,92L729.238,92L721.317,116L720,116C713.165,116 707.625,121.373 707.625,128C707.625,134.623 713.17,140 720,140C720.072,140 720.144,139.999 720.216,139.998L720.216,140L769.5,140L761.579,164Z',
    arms: [
      ['761.579,164', '729.238,164'],
      ['769.5,140', '721.317,140'],
    ],
  },
  {
    transform: `${OUTER_TRANSFORM} matrix(0.917198,0,0,1,-223.93,-876)`,
    scaleX: 0.969697 * 0.917198,
    fill: 'rgb(1,122,183)',
    d: 'M1065.83,1064L1029.14,1064C991.913,1064 961.684,1037.12 961.684,1004C961.684,971.197 991.282,944.542 1028.02,944.008L1028.02,944L1047.85,944L1039.21,968L1029.14,968C1006.79,968 988.669,984.118 988.669,1004C988.669,1023.87 1006.81,1040 1029.14,1040C1029.38,1040 1029.62,1040 1029.85,1040L1029.85,1040L1074.47,1040L1065.83,1064ZM1083.11,1040L1083.11,1040L1083.11,1064L1083.11,1064L1083.11,1040Z',
    arms: [
      ['1065.83,1064', '1047.85,1064'],
      ['1074.47,1040', '1039.21,1040'],
    ],
  },
  {
    transform: OUTER_TRANSFORM,
    scaleX: 0.969697,
    fill: 'rgb(10,75,105)',
    d: 'M745.738,212L720.025,212L720,212C672.202,212 633.389,174.377 633.375,128.024C633.361,81.958 671.591,44.542 718.969,44.006L718.969,44L719.975,44L745.079,44L737.159,68L719.982,68C685.809,68.01 658.115,94.88 658.125,128.017C658.135,161.126 685.858,188 720,188L720.018,188C720.378,188 720.738,187.997 721.098,187.991L721.098,188L753.659,188L745.738,212Z',
    arms: [
      ['745.738,212', '745.079,212'],
      ['753.659,188', '737.159,188'],
    ],
  },
  {
    transform: `${OUTER_TRANSFORM} matrix(1.03125,0,0,1,588,0)`,
    scaleX: 0.969697 * 1.03125,
    fill: 'rgb(5,40,61)',
    d: 'M128,236C68.393,236 20,187.607 20,128C20,68.353 68.353,20 128,20L160,20L152.319,44L128,44C81.608,44 44,81.608 44,128C44,174.361 81.639,212 128,212C127.756,212.004 127.878,212.004 128,212.003C128.122,212.002 128.244,212 128,212L152.958,212L145.277,236L128,236ZM128,236C128.628,236 127.372,236.011 128,236Z',
    arms: [
      ['152.958,212', '152.319,212'],
      ['145.277,236', '160,236'],
    ],
  },
];

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
