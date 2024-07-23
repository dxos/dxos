//
// Copyright 2024 DXOS.org
//

import React from 'react';

export const auroraStyle = `
:root {
  --aurora-color-3: oklch(92.5% 0.039 230.41);
  --aurora-color-2: oklch(90% 0.052 177.28);
  --aurora-color-1: oklch(92% 0.052 264.47);
  --aurora-glow-tl: rgb(100,250,155);
  --aurora-glow-br: rgb(100,100,220);
  --aurora-glow-opacity: 0.05;
}
.dark {
  --aurora-color-1: oklch(5% 0.09 283.94);
  --aurora-color-2: oklch(21% 0.08 177.28);
  --aurora-color-3: oklch(11% 0.09 264.47);
  --aurora-glow-tl: rgb(100,200,150);
  --aurora-glow-br: rgb(100,100,200);
  --aurora-glow-opacity: 0.4;
}
`;

export const Aurora = () => (
  <svg
    xmlns='http://www.w3.org/2000/svg'
    viewBox='0 0 1429 1197'
    width='1429'
    height='1197'
    style={{
      shapeRendering: 'auto',
      display: 'block',
      width: '100%',
      height: '100%',
      background: 'var(--aurora-color-1, #000000)',
      transform: 'scaleY(-1)',
    }}
    preserveAspectRatio='xMidYMid slice'
  >
    <defs>
      <filter id='main'>
        <feGaussianBlur stdDeviation={90} colorInterpolationFilters='sRGB' />
      </filter>
      <linearGradient y2='1' y1='0' x2='0' x1='0' id='lg1'>
        <stop offset='0' stopOpacity='1' stopColor='var(--aurora-color-2, #4415c3)'></stop>
        <stop offset='0.8' stopOpacity='1' stopColor='var(--aurora-color-3, #500706)'></stop>
        <stop offset='1' stopOpacity='1' stopColor='var(--aurora-color-3, #500706)'></stop>
      </linearGradient>
      <radialGradient r='2' cy='0.5' cx='0.5' id='lg2'>
        <stop offset='0' stopOpacity='1' stopColor='var(--aurora-color-1, #000000)'></stop>
        <stop offset='0.4' stopOpacity='1' stopColor='var(--aurora-color-3, #500706)'></stop>
        <stop offset='1' stopOpacity='1' stopColor='var(--aurora-color-3, #500706)'></stop>
      </radialGradient>
      <radialGradient id='glow-tl' cx='40%' cy='60%' r='70%' gradientUnits='userSpaceOnUse'>
        <stop offset='0%' stopColor='var(--aurora-glow-tl)' stopOpacity='var(--aurora-glow-opacity)' />
        <stop offset='100%' stopColor='var(--aurora-glow-tl)' stopOpacity='0' />
      </radialGradient>
      <radialGradient id='glow-br' cx='60%' cy='40%' r='70%' gradientUnits='userSpaceOnUse'>
        <stop offset='0%' stopColor='var(--aurora-glow-br)' stopOpacity='var(--aurora-glow-opacity)' />
        <stop offset='100%' stopColor='var(--aurora-glow-br)' stopOpacity='0' />
      </radialGradient>
      <filter id='noise'>
        <feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch' />
        <feColorMatrix type='saturate' values='0' />
        <feComponentTransfer>
          <feFuncA type='table' tableValues='0 0.05' />
        </feComponentTransfer>
      </filter>
    </defs>
    <g filter='url(#main)'>
      <rect fill='url(#lg2)' height='1268.45' width='1500.45' y='-71.45' x='-71.45'></rect>
      <path
        fill='url(#lg1)'
        d='M-71.45 598.5
C178.625 598.5 178.625 538.65 357.25 538.65
C535.875 538.65 893.125 658.35 1071.75 658.35
C1250.375 658.35 1250.375 598.5 1500.45 598.5 L1500.45 1268.45 L-71.45 1268.45 Z'
      >
        <animate
          keySplines='0.5 0 0.5 1;0.5 0 0.5 1'
          calcMode='spline'
          keyTimes='0;0.5;1'
          repeatCount='indefinite'
          dur='8s'
          values='M-71.45 598.5
      C178.625 598.5 178.625 478.65 357.25 478.65
      C535.875 478.65 893.125 718.35 1071.75 718.35
      C1250.375 718.35 1250.375 598.5 1500.45 598.5 L1500.45 1268.45 L-71.45 1268.45 Z;M-71.45 598.5
      C178.625 598.5 178.625 718.35 357.25 718.35
      C535.875 718.35 893.125 478.65 1071.75 478.65
      C1250.375 478.65 1250.375 598.5 1500.45 598.5 L1500.45 1268.45 L-71.45 1268.45 Z;M-71.45 598.5
      C178.625 598.5 178.625 478.65 357.25 478.65
      C535.875 478.65 893.125 718.35 1071.75 718.35
      C1250.375 718.35 1250.375 598.5 1500.45 598.5 L1500.45 1268.45 L-71.45 1268.45 Z'
          attributeName='d'
        />
      </path>
    </g>
    <rect width='100%' height='100%' fill='url(#glow-tl)' />
    <rect width='100%' height='100%' fill='url(#glow-br)' />
    <rect width='100%' height='100%' filter='url(#noise)' />
  </svg>
);
