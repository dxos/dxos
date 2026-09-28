//
// Copyright 2026 DXOS.org
//

// React-free, so the mark can be rendered to markup where no React runs (autocue's injected countdown).

import { brandColors } from './brand-colors.ts';

export type ComposerLogoPath = { color: string; d: string };

/** The Composer mark's rings, outer to inner, for a `size`-pixel square. */
export const composerLogoPaths = (size = 512): ComposerLogoPath[] => {
  const n = brandColors.length;
  const cx = size / 2;
  const cy = size / 2;
  const ringWidth = size / 2 / (n + 0.5);
  return brandColors.map((color, i) => {
    const outerR = size / 2 - i * ringWidth;
    const innerR = outerR - ringWidth;
    // TODO(burdon): Animate bottom length.
    const mirrorOuterR = size - (n - 1 - i) * ringWidth;
    const mirrorInnerR = mirrorOuterR - ringWidth;
    return { color, d: makeBrandLayerPath(cx, cy, outerR, innerR, mirrorOuterR, mirrorInnerR) };
  });
};

/** The Composer mark as standalone SVG markup, scaled by its container. */
export const composerLogoSvg = (size = 512): string =>
  `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true">${composerLogoPaths(size)
    .map(({ color, d }) => `<path fill="${color}" d="${d}"/>`)
    .join('')}</svg>`;

/**
 * Shape: left semicircle ring (6 → 9 → 12 o'clock) with a
 * horizontal-then-diagonal stepped edge at each open end, matching the
 * Composer brand icon geometry. Two 90° arcs avoid the 180° SVG ambiguity.
 */
const makeBrandLayerPath = (cx: number, cy: number, r1: number, r2: number, r3: number, r4: number): string => {
  const frac = 0.3;
  const topOuter = r1 * frac;
  const topInner = r2 * frac;
  const botOuter = r4 * frac;
  const botInner = r3 * frac;
  return [
    // Start at outer top-right.
    `M ${cx + topOuter} ${cy - r1}`,
    // Move left to 12-oclock.
    `L ${cx} ${cy - r1}`,
    // Outer arc CW: 12 → 9 → 6 o'clock (through the west side).
    `A ${r1} ${r1} 0 0 0 ${cx - r1} ${cy}`,
    `A ${r1} ${r1} 0 0 0 ${cx} ${cy + r1}`,
    // Bottom outer: extend right.
    `L ${cx + botOuter} ${cy + r1}`,
    // Diagonal to inner bottom-right.
    `L ${cx + botInner} ${cy + r2}`,
    // Move left to inner 6-oclock.
    `L ${cx} ${cy + r2}`,
    // Inner arc CCW: 6 → 9 → 12 o'clock (back through the west side).
    `A ${r2} ${r2} 0 0 1 ${cx - r2} ${cy}`,
    `A ${r2} ${r2} 0 0 1 ${cx} ${cy - r2}`,
    // Top inner: extend right.
    `L ${cx + topInner} ${cy - r2}`,
    // Close: diagonal back to start.
    'Z',
  ].join(' ');
};
