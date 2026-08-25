//
// Copyright 2026 DXOS.org
//

import { type Shortcut } from '@dxos/plugin-space/dashboard';

import { deviceColors, hueColor } from './palette';
import { escapeXml, wrapText } from './text';

/** Inline icon geometry, resolved from the app's sprite by `resolveIcon`. */
export type IconMarkup = {
  /** Children of the sprite `<symbol>`, inlined verbatim. */
  markup: string;
  viewBox: string;
};

export type RenderKeyOptions = {
  /** Square key size in pixels; the Stream Deck + accepts 144x144. */
  size?: number;
  icon?: IconMarkup;
};

const DEFAULT_SIZE = 144;
const ICON_FRACTION = 0.4;
const MAX_LINES = 2;
/** Characters that fit one line at the label font size; calibrated by eye, not measured. */
const MAX_CHARS = 11;

const svg = (size: number, body: string): string =>
  [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`,
    body,
    '</svg>',
  ].join('');

const background = (size: number): string =>
  `<rect x="0" y="0" width="${size}" height="${size}" rx="${Math.round(size * 0.11)}" fill="${
    deviceColors.keyBackground
  }" stroke="${deviceColors.keyBorder}" stroke-width="2"/>`;

/**
 * Renders one key as an SVG string. Elgato's `setImage` takes SVG directly, so nothing is
 * rasterised: the output is deterministic, snapshot-testable, and the storybook virtual device
 * displays the identical markup the hardware receives.
 */
export const renderKey = (spec: Shortcut, { size = DEFAULT_SIZE, icon }: RenderKeyOptions = {}): string => {
  const color = hueColor(spec.hue);
  const iconSize = Math.round(size * ICON_FRACTION);
  const iconTop = Math.round(size * 0.16);
  const fontSize = Math.round(size * 0.12);
  const lines = wrapText(spec.label, MAX_CHARS, MAX_LINES);
  const firstBaseline = Math.round(size * 0.74);

  const glyph = icon
    ? [
        `<svg x="${Math.round((size - iconSize) / 2)}" y="${iconTop}" width="${iconSize}" height="${iconSize}"`,
        // `color` makes the sprite's `fill="currentColor"` resolve outside the app's stylesheet.
        ` viewBox="${icon.viewBox}" fill="${color}" color="${color}">${icon.markup}</svg>`,
      ].join('')
    : `<circle cx="${size / 2}" cy="${iconTop + iconSize / 2}" r="${iconSize / 4}" fill="${color}" opacity="0.4"/>`;

  const label = lines
    .map(
      (line, index) =>
        `<text x="${size / 2}" y="${firstBaseline + index * (fontSize + 4)}" text-anchor="middle" ` +
        `font-family="Inter, system-ui, sans-serif" font-size="${fontSize}" fill="${deviceColors.label}">` +
        `${escapeXml(line)}</text>`,
    )
    .join('');

  return svg(size, `${background(size)}${glyph}${label}`);
};

/** An unassigned slot still needs an image, otherwise the device keeps whatever was there before. */
export const renderEmptyKey = (size = DEFAULT_SIZE): string => svg(size, background(size));
