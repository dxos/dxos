//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { hues } from './tokens';
import { mx } from './util';

const colorShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const neutralShades = [50, 75, 100, 200, 250, 300, 400, 500, 600, 700, 750, 800, 900, 925, 950];

/**
 * Hue swatch classes for the Hues story.
 * Class names must be full literal strings for Tailwind v4's scanner.
 */
// prettier-ignore
const hueSwatches = [
  { hue: 'neutral', bg: 'bg-neutral-surface', border: 'border-neutral-fill', text: 'text-neutral-surface-text' },
  { hue: 'red',     bg: 'bg-red-surface',     border: 'border-red-fill',     text: 'text-red-surface-text' },
  { hue: 'orange',  bg: 'bg-orange-surface',  border: 'border-orange-fill',  text: 'text-orange-surface-text' },
  { hue: 'amber',   bg: 'bg-amber-surface',   border: 'border-amber-fill',   text: 'text-amber-surface-text' },
  { hue: 'yellow',  bg: 'bg-yellow-surface',  border: 'border-yellow-fill',  text: 'text-yellow-surface-text' },
  { hue: 'lime',    bg: 'bg-lime-surface',    border: 'border-lime-fill',    text: 'text-lime-surface-text' },
  { hue: 'green',   bg: 'bg-green-surface',   border: 'border-green-fill',   text: 'text-green-surface-text' },
  { hue: 'emerald', bg: 'bg-emerald-surface', border: 'border-emerald-fill', text: 'text-emerald-surface-text' },
  { hue: 'teal',    bg: 'bg-teal-surface',    border: 'border-teal-fill',    text: 'text-teal-surface-text' },
  { hue: 'cyan',    bg: 'bg-cyan-surface',    border: 'border-cyan-fill',    text: 'text-cyan-surface-text' },
  { hue: 'sky',     bg: 'bg-sky-surface',     border: 'border-sky-fill',     text: 'text-sky-surface-text' },
  { hue: 'blue',    bg: 'bg-blue-surface',    border: 'border-blue-fill',    text: 'text-blue-surface-text' },
  { hue: 'indigo',  bg: 'bg-indigo-surface',  border: 'border-indigo-fill',  text: 'text-indigo-surface-text' },
  { hue: 'violet',  bg: 'bg-violet-surface',  border: 'border-violet-fill',  text: 'text-violet-surface-text' },
  { hue: 'purple',  bg: 'bg-purple-surface',  border: 'border-purple-fill',  text: 'text-purple-surface-text' },
  { hue: 'fuchsia', bg: 'bg-fuchsia-surface', border: 'border-fuchsia-fill', text: 'text-fuchsia-surface-text' },
  { hue: 'pink',    bg: 'bg-pink-surface',    border: 'border-pink-fill',    text: 'text-pink-surface-text' },
  { hue: 'rose',    bg: 'bg-rose-surface',    border: 'border-rose-fill',    text: 'text-rose-surface-text' },
] as const;

const hueSwatchMap = Object.fromEntries(hueSwatches.map((entry) => [entry.hue, entry]));

const ColorSwatch = ({ hue }: { hue: string }) => {
  const colors = hueSwatchMap[hue];
  return (
    <div
      className={mx(
        'shrink-0 aspect-square w-36 flex flex-col overflow-hidden border-4 rounded-md',
        colors?.bg,
        colors?.border,
      )}
    >
      <span className={mx('text-sm p-2', colors?.text)}>{hue}</span>
    </div>
  );
};

const HueSwatch = ({ hue, shades }: { hue: string; shades: number[] }) => (
  <div className='flex gap-1'>
    {shades.map((shade) => (
      <div
        key={shade}
        className='shrink-0 aspect-square w-24 flex flex-col rounded-sm'
        style={{ backgroundColor: `var(--color-${hue}-${shade})` }}
      >
        <span
          className='flex flex-col h-full justify-between text-sm p-2'
          style={{ color: shade <= 500 ? 'black' : 'white' }}
        >
          <span className='text-xs'>{shade}</span>
          {shade === 500 && <span className='text-xs'>{hue}</span>}
        </span>
      </div>
    ))}
  </div>
);

const meta = {
  title: 'ui/ui-theme/Theme',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

export const Hues = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-wrap gap-2'>
          {['neutral', ...hues].map((hue) => (
            <ColorSwatch key={hue} hue={hue} />
          ))}
        </div>
      </div>
    );
  },
};

export const Colors = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-col gap-1'>
          {['neutral', ...hues].map((hue) => (
            <HueSwatch key={hue} hue={hue} shades={colorShades} />
          ))}
        </div>
      </div>
    );
  },
};

export const Neutral = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-col items-center'>
          {neutralShades.map((value) => (
            <div
              key={value}
              style={{
                backgroundColor: `var(--color-neutral-${value})`,
              }}
              className={mx('h-12 w-48 p-2 text-right text-sm', value <= 500 ? 'text-neutral-950' : 'text-neutral-50')}
            >
              {value}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Surfaces = {
  render: () => {
    return (
      <div className='absolute inset-0 h-full p-4 bg-white dark:bg-black'>
        <div className='flex flex-wrap gap-2'>
          {[
            { className: 'bg-scrim-surface', label: 'scrim' },
            { className: 'bg-base-surface', label: 'base' },
            { className: 'bg-deck-surface', label: 'deck' },
            { className: 'bg-group-surface', label: 'group' },
            { className: 'bg-sidebar-surface', label: 'sidebar' },
            { className: 'bg-header-surface', label: 'header' },
            { className: 'bg-card-surface', label: 'card' },
            { className: 'bg-modal-surface', label: 'modal' },
            { className: 'bg-input-surface', label: 'input' },
            { className: 'bg-active-surface', label: 'active' },
            { className: 'bg-hover-surface', label: 'hover' },
            { className: 'bg-inverse-surface text-inverse-text', label: 'inverse' },
          ].map(({ className, label }) => (
            <div key={className} className={mx('shrink-0 p-2 aspect-square w-48 rounded-md', className)}>
              {label}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Tags = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex gap-2'>
          {['neutral', ...hues].map((hue) => (
            <div key={hue} className='dx-tag' data-hue={hue}>
              {hue}
            </div>
          ))}
        </div>
      </div>
    );
  },
};

export const Animation = {
  render: () => {
    return (
      <div className='absolute inset-0 grid place-items-center'>
        <div className='density-coarse border border-separator rounded-md'>
          <div
            className={mx(
              'flex items-center font-mono text-2xl text-test-experimental',
              'p-card-padding w-card-min-width grid grid-cols-[min-content_1fr_min-content]',
            )}
          >
            <span className='animate-blink text-error'>*</span>
            <span className='text-center'>experimental</span>
            <span className='animate-blink text-error'>*</span>
          </div>
        </div>
      </div>
    );
  },
};
