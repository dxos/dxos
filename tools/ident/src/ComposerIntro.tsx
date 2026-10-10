//
// Copyright 2026 DXOS.org
//

import montserrat from '@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2';
import { loadFont } from '@remotion/fonts';
import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { COLORS, TIMING } from './brand.ts';

/** Composer's wordmark face: variable Montserrat, set light. */
const WORDMARK_FAMILY = 'Montserrat';
void loadFont({ family: WORDMARK_FAMILY, url: montserrat, weight: '100 900' });

/**
 * The Composer icon's four arcs (packages/ui/brand/assets/icons/composer-icon.svg), outermost first. Each is
 * drawn in its own full-size SVG so it rotates about the icon's centre.
 */
const ARCS: { fill: string; path: React.ReactNode }[] = [
  {
    fill: 'rgb(5,40,61)',
    path: (
      <g transform='matrix(1.03125,0,0,1,588,0)'>
        <path d='M128,236C68.393,236 20,187.607 20,128C20,68.353 68.353,20 128,20L160,20L152.319,44L128,44C81.608,44 44,81.608 44,128C44,174.361 81.639,212 128,212C127.756,212.004 127.878,212.004 128,212.003C128.122,212.002 128.244,212 128,212L152.958,212L145.277,236L128,236ZM128,236C128.628,236 127.372,236.011 128,236Z' />
      </g>
    ),
  },
  {
    fill: 'rgb(10,75,105)',
    path: (
      <path d='M745.738,212L720.025,212L720,212C672.202,212 633.389,174.377 633.375,128.024C633.361,81.958 671.591,44.542 718.969,44.006L718.969,44L719.975,44L745.079,44L737.159,68L719.982,68C685.809,68.01 658.115,94.88 658.125,128.017C658.135,161.126 685.858,188 720,188L720.018,188C720.378,188 720.738,187.997 721.098,187.991L721.098,188L753.659,188L745.738,212Z' />
    ),
  },
  {
    fill: 'rgb(1,122,183)',
    path: (
      <g transform='matrix(0.917198,0,0,1,-223.93,-876)'>
        <path d='M1065.83,1064L1029.14,1064C991.913,1064 961.684,1037.12 961.684,1004C961.684,971.197 991.282,944.542 1028.02,944.008L1028.02,944L1047.85,944L1039.21,968L1029.14,968C1006.79,968 988.669,984.118 988.669,1004C988.669,1023.87 1006.81,1040 1029.14,1040C1029.38,1040 1029.62,1040 1029.85,1040L1029.85,1040L1074.47,1040L1065.83,1064ZM1083.11,1040L1083.11,1040L1083.11,1064L1083.11,1064L1083.11,1040Z' />
      </g>
    ),
  },
  {
    fill: 'rgb(6,197,253)',
    path: (
      <path d='M761.579,164L720,164C699.51,164 682.875,147.869 682.875,128C682.875,108.452 698.942,92.543 718.969,92.014L718.969,92L729.238,92L721.317,116L720,116C713.165,116 707.625,121.373 707.625,128C707.625,134.623 713.17,140 720,140C720.072,140 720.144,139.999 720.216,139.998L720.216,140L769.5,140L761.579,164Z' />
    ),
  },
];

/** Seconds between one arc starting and the next. */
const ARC_STAGGER = 0.12;

/** The Composer mark assembles arc by arc, then the name slides in beside it and holds. */
export const ComposerIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const u = Math.min(width, height) / 1080;
  const portrait = height > width;
  const size = Math.round(300 * u);
  const t = frame / fps;

  const nameStart = ARC_STAGGER * ARCS.length + 0.35;
  const nameIn = interpolate(t, [nameStart, nameStart + 0.6], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const fadeOut = interpolate(t, [TIMING.composer.duration - 0.4, TIMING.composer.duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.ground,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: portrait ? 'column' : 'row',
        gap: portrait ? Math.round(40 * u) : 0,
        opacity: fadeOut,
      }}
    >
      {/* The arcs open to the right, so the right third of the icon's box is empty: pull the name into it. */}
      <div
        style={{
          position: 'relative',
          width: size,
          height: size,
          marginRight: portrait ? 0 : -Math.round(size * 0.16),
        }}
      >
        {ARCS.map((arc, index) => {
          const progress = spring({
            frame: frame - Math.round(index * ARC_STAGGER * fps),
            fps,
            config: { damping: 14, mass: 0.8 },
          });
          return (
            <svg
              key={arc.fill}
              viewBox='0 0 256 256'
              style={{
                position: 'absolute',
                inset: 0,
                width: size,
                height: size,
                opacity: Math.min(1, progress * 1.5),
                transform: `rotate(${(1 - progress) * -140}deg) scale(${0.6 + 0.4 * progress})`,
              }}
            >
              <g transform='matrix(0.969697,0,0,1,-570.182,0)' style={{ fill: arc.fill }}>
                {arc.path}
              </g>
            </svg>
          );
        })}
      </div>
      <div
        style={{
          fontFamily: `"${WORDMARK_FAMILY}", sans-serif`,
          fontWeight: 300,
          fontSize: Math.round(200 * u),
          lineHeight: 1,
          letterSpacing: '0.01em',
          color: COLORS.main,
          opacity: nameIn,
          transform: portrait ? `translateY(${(1 - nameIn) * 40 * u}px)` : `translateX(${(1 - nameIn) * -40 * u}px)`,
        }}
      >
        composer
      </div>
    </AbsoluteFill>
  );
};
