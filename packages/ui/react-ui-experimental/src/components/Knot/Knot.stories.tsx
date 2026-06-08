//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { useControls } from 'leva';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Knot } from './Knot';
import { defaultOptions, presets } from './three';

/**
 * Coerces a leva color control value into a 24-bit hex integer.
 * Accepts the four shapes leva may produce depending on its input control:
 * - `number`: already a packed 24-bit int, returned as-is.
 * - `string`: hex like `#RRGGBB` or `RRGGBB`, parsed via `parseInt` (NaN → fallback).
 * - `[r, g, b]`: array channels assumed normalized in `[0, 1]`, clamped then scaled to `[0, 255]`.
 * - `{ r, g, b }`: object channels assumed integers in `[0, 255]`, rounded to int.
 * Unrecognized shapes return the supplied `fallback`.
 */
const toHex = (color: unknown, fallback: number): number => {
  if (typeof color === 'number') {
    return color;
  }
  if (typeof color === 'string') {
    const parsed = parseInt(color.replace('#', ''), 16);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (Array.isArray(color) && color.length >= 3) {
    const [r, g, b] = color.map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255));
    return (r << 16) | (g << 8) | b;
  }
  if (color && typeof color === 'object' && 'r' in color && 'g' in color && 'b' in color) {
    const { r, g, b } = color as { r: number; g: number; b: number };
    return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }
  return fallback;
};

const StoryKnot = () => {
  // Scope controls under a "Knot" folder so leva keys don't collide with other
  // sibling stories (e.g. Chaos also has a `color` control typed as a vec3,
  // and the global leva store would otherwise hand us the wrong shape on
  // story navigation).
  const { preset, color, radius, threshold, strength, exposure } = useControls('Knot', {
    preset: { label: 'Preset', value: 'red', options: Object.keys(presets) },
    color: { label: 'Color', value: '#' + defaultOptions.color.toString(16).padStart(6, '0') },
    radius: { label: 'Bloom radius', value: defaultOptions.radius, min: 0, max: 1, step: 0.01 },
    threshold: { label: 'Bloom threshold', value: defaultOptions.threshold, min: 0, max: 1, step: 0.01 },
    strength: { label: 'Bloom strength', value: defaultOptions.strength, min: 0, max: 3, step: 0.05 },
    exposure: { label: 'Exposure', value: defaultOptions.exposure, min: 0.1, max: 2, step: 0.01 },
  });

  const options = useMemo(() => {
    const base = presets[preset] ?? defaultOptions;
    return {
      ...base,
      color: toHex(color, base.color),
      radius,
      threshold,
      strength,
      exposure,
    };
  }, [preset, color, radius, threshold, strength, exposure]);

  return <Knot options={options} />;
};

const meta = {
  title: 'ui/react-ui-experimental/Knot',
  component: StoryKnot,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof StoryKnot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
