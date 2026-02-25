//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { hues } from './tokens';
import { mx } from './util';

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

const Swatch = ({ hue }: { hue: string }) => {
  const colors = hueSwatchMap[hue];
  return (
    <div
      className={mx(
        'shrink-0 aspect-square w-36 flex flex-col overflow-hidden border rounded-sm',
        colors?.bg,
        colors?.border,
      )}
    >
      <span className={mx('text-sm p-2', colors?.text)}>{hue}</span>
    </div>
  );
};

/**
 * Palette shade classes for the Palette story.
 */
// prettier-ignore
const paletteShades: Record<string, Record<number, string>> = {
  neutral: { 50: 'bg-neutral-50', 100: 'bg-neutral-100', 200: 'bg-neutral-200', 300: 'bg-neutral-300', 400: 'bg-neutral-400', 500: 'bg-neutral-500', 600: 'bg-neutral-600', 700: 'bg-neutral-700', 800: 'bg-neutral-800', 900: 'bg-neutral-900', 950: 'bg-neutral-925' },
  red:     { 50: 'bg-red-50',     100: 'bg-red-100',     200: 'bg-red-200',     300: 'bg-red-300',     400: 'bg-red-400',     500: 'bg-red-500',     600: 'bg-red-600',     700: 'bg-red-700',     800: 'bg-red-800',     900: 'bg-red-900',     950: 'bg-red-950' },
  orange:  { 50: 'bg-orange-50',  100: 'bg-orange-100',  200: 'bg-orange-200',  300: 'bg-orange-300',  400: 'bg-orange-400',  500: 'bg-orange-500',  600: 'bg-orange-600',  700: 'bg-orange-700',  800: 'bg-orange-800',  900: 'bg-orange-900',  950: 'bg-orange-950' },
  amber:   { 50: 'bg-amber-50',   100: 'bg-amber-100',   200: 'bg-amber-200',   300: 'bg-amber-300',   400: 'bg-amber-400',   500: 'bg-amber-500',   600: 'bg-amber-600',   700: 'bg-amber-700',   800: 'bg-amber-800',   900: 'bg-amber-900',   950: 'bg-amber-950' },
  yellow:  { 50: 'bg-yellow-50',  100: 'bg-yellow-100',  200: 'bg-yellow-200',  300: 'bg-yellow-300',  400: 'bg-yellow-400',  500: 'bg-yellow-500',  600: 'bg-yellow-600',  700: 'bg-yellow-700',  800: 'bg-yellow-800',  900: 'bg-yellow-900',  950: 'bg-yellow-950' },
  lime:    { 50: 'bg-lime-50',    100: 'bg-lime-100',    200: 'bg-lime-200',    300: 'bg-lime-300',    400: 'bg-lime-400',    500: 'bg-lime-500',    600: 'bg-lime-600',    700: 'bg-lime-700',    800: 'bg-lime-800',    900: 'bg-lime-900',    950: 'bg-lime-950' },
  green:   { 50: 'bg-green-50',   100: 'bg-green-100',   200: 'bg-green-200',   300: 'bg-green-300',   400: 'bg-green-400',   500: 'bg-green-500',   600: 'bg-green-600',   700: 'bg-green-700',   800: 'bg-green-800',   900: 'bg-green-900',   950: 'bg-green-950' },
  emerald: { 50: 'bg-emerald-50', 100: 'bg-emerald-100', 200: 'bg-emerald-200', 300: 'bg-emerald-300', 400: 'bg-emerald-400', 500: 'bg-emerald-500', 600: 'bg-emerald-600', 700: 'bg-emerald-700', 800: 'bg-emerald-800', 900: 'bg-emerald-900', 950: 'bg-emerald-950' },
  teal:    { 50: 'bg-teal-50',    100: 'bg-teal-100',    200: 'bg-teal-200',    300: 'bg-teal-300',    400: 'bg-teal-400',    500: 'bg-teal-500',    600: 'bg-teal-600',    700: 'bg-teal-700',    800: 'bg-teal-800',    900: 'bg-teal-900',    950: 'bg-teal-950' },
  cyan:    { 50: 'bg-cyan-50',    100: 'bg-cyan-100',    200: 'bg-cyan-200',    300: 'bg-cyan-300',    400: 'bg-cyan-400',    500: 'bg-cyan-500',    600: 'bg-cyan-600',    700: 'bg-cyan-700',    800: 'bg-cyan-800',    900: 'bg-cyan-900',    950: 'bg-cyan-950' },
  sky:     { 50: 'bg-sky-50',     100: 'bg-sky-100',     200: 'bg-sky-200',     300: 'bg-sky-300',     400: 'bg-sky-400',     500: 'bg-sky-500',     600: 'bg-sky-600',     700: 'bg-sky-700',     800: 'bg-sky-800',     900: 'bg-sky-900',     950: 'bg-sky-950' },
  blue:    { 50: 'bg-blue-50',    100: 'bg-blue-100',    200: 'bg-blue-200',    300: 'bg-blue-300',    400: 'bg-blue-400',    500: 'bg-blue-500',    600: 'bg-blue-600',    700: 'bg-blue-700',    800: 'bg-blue-800',    900: 'bg-blue-900',    950: 'bg-blue-950' },
  indigo:  { 50: 'bg-indigo-50',  100: 'bg-indigo-100',  200: 'bg-indigo-200',  300: 'bg-indigo-300',  400: 'bg-indigo-400',  500: 'bg-indigo-500',  600: 'bg-indigo-600',  700: 'bg-indigo-700',  800: 'bg-indigo-800',  900: 'bg-indigo-900',  950: 'bg-indigo-950' },
  violet:  { 50: 'bg-violet-50',  100: 'bg-violet-100',  200: 'bg-violet-200',  300: 'bg-violet-300',  400: 'bg-violet-400',  500: 'bg-violet-500',  600: 'bg-violet-600',  700: 'bg-violet-700',  800: 'bg-violet-800',  900: 'bg-violet-900',  950: 'bg-violet-950' },
  purple:  { 50: 'bg-purple-50',  100: 'bg-purple-100',  200: 'bg-purple-200',  300: 'bg-purple-300',  400: 'bg-purple-400',  500: 'bg-purple-500',  600: 'bg-purple-600',  700: 'bg-purple-700',  800: 'bg-purple-800',  900: 'bg-purple-900',  950: 'bg-purple-950' },
  fuchsia: { 50: 'bg-fuchsia-50', 100: 'bg-fuchsia-100', 200: 'bg-fuchsia-200', 300: 'bg-fuchsia-300', 400: 'bg-fuchsia-400', 500: 'bg-fuchsia-500', 600: 'bg-fuchsia-600', 700: 'bg-fuchsia-700', 800: 'bg-fuchsia-800', 900: 'bg-fuchsia-900', 950: 'bg-fuchsia-950' },
  pink:    { 50: 'bg-pink-50',    100: 'bg-pink-100',    200: 'bg-pink-200',    300: 'bg-pink-300',    400: 'bg-pink-400',    500: 'bg-pink-500',    600: 'bg-pink-600',    700: 'bg-pink-700',    800: 'bg-pink-800',    900: 'bg-pink-900',    950: 'bg-pink-950' },
  rose:    { 50: 'bg-rose-50',    100: 'bg-rose-100',    200: 'bg-rose-200',    300: 'bg-rose-300',    400: 'bg-rose-400',    500: 'bg-rose-500',    600: 'bg-rose-600',    700: 'bg-rose-700',    800: 'bg-rose-800',    900: 'bg-rose-900',    950: 'bg-rose-950' },
};

// prettier-ignore
const neutralShades = [
  { shade:  50, className: 'bg-neutral-50' },
  { shade:  75, className: 'bg-neutral-75' },
  { shade: 100, className: 'bg-neutral-100' },
  { shade: 200, className: 'bg-neutral-200' },
  { shade: 250, className: 'bg-neutral-250' },
  { shade: 300, className: 'bg-neutral-300' },
  { shade: 400, className: 'bg-neutral-400' },
  { shade: 500, className: 'bg-neutral-500' },
  { shade: 600, className: 'bg-neutral-600' },
  { shade: 700, className: 'bg-neutral-700' },
  { shade: 750, className: 'bg-neutral-750' },
  { shade: 800, className: 'bg-neutral-800' },
  { shade: 900, className: 'bg-neutral-900' },
  { shade: 925, className: 'bg-neutral-925' },
  { shade: 950, className: 'bg-neutral-950' },
];

const PaletteSwatch = ({ hue, shades }: { hue: string; shades: number[] }) => (
  <div className='flex gap-1'>
    {shades.map((shade) => (
      <div
        key={shade}
        className={mx('shrink-0 aspect-square w-24 flex flex-col rounded-sm', paletteShades[hue]?.[shade])}
      >
        <span
          className='flex flex-col h-full justify-between text-sm p-2'
          style={{
            color: shade <= 500 ? 'black' : 'white',
          }}
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
            <Swatch key={hue} hue={hue} />
          ))}
        </div>
      </div>
    );
  },
};

export const Palette = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-col gap-1'>
          {['neutral', ...hues].map((hue) => (
            <PaletteSwatch key={hue} hue={hue} shades={[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]} />
          ))}
        </div>
      </div>
    );
  },
};

export const NeutralPalette = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-col items-center'>
          {neutralShades.map(({ shade, className }) => (
            <div
              key={shade}
              className={mx(
                className,
                'h-12 w-48 p-2 text-right text-sm',
                shade <= 500 ? 'text-neutral-950' : 'text-neutral-50',
              )}
            >
              {shade}
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
