//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { hueShades, hues } from './defs';
import { mx } from './util';

// prettier-ignore
const neutralShades: [number, string][] = [
  [50,  'bg-neutral-50'],
  [75,  'bg-neutral-75'],
  [100, 'bg-neutral-100'],
  [200, 'bg-neutral-200'],
  [250, 'bg-neutral-250'],
  [300, 'bg-neutral-300'],
  [400, 'bg-neutral-400'],
  [500, 'bg-neutral-500'],
  [600, 'bg-neutral-600'],
  [700, 'bg-neutral-700'],
  [750, 'bg-neutral-750'],
  [800, 'bg-neutral-800'],
  [900, 'bg-neutral-900'],
  [925, 'bg-neutral-925'],
  [950, 'bg-neutral-950'],
];

const ColorSwatch = ({ hue }: { hue: string }) => {
  return (
    <div
      style={{
        borderColor: `var(--color-${hue}-border)`,
      }}
      className={mx('shrink-0 aspect-square w-36 grid grid-rows-3 border-2 overflow-hidden rounded-md')}
    >
      <div
        style={{
          color: `var(--color-${hue}-text)`,
          backgroundColor: `var(--color-base-surface)`,
        }}
        className='p-2 text-sm'
      >
        {hue}
      </div>
      <div
        style={{
          color: `var(--color-${hue}-border)`,
          backgroundColor: `var(--color-${hue}-fill)`,
        }}
        className='p-2 text-sm flex items-center'
      >
        <svg className='h-6 w-6'>
          <use href='/icons.svg#ph--aperture--regular' />
        </svg>
      </div>
      <div
        style={{
          color: `var(--color-${hue}-surface-text)`,
          backgroundColor: `var(--color-${hue}-surface)`,
        }}
        className='p-2 text-sm'
      >
        {hue}
      </div>
    </div>
  );
};

const HueSwatch = ({ hue, shades }: { hue: string; shades: readonly number[] }) => (
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

export const Styles = {
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
            <HueSwatch key={hue} hue={hue} shades={hueShades} />
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
          {neutralShades.map(([value, className]) => (
            <div
              key={value}
              className={mx(
                'h-12 w-48 p-2 text-right text-sm',
                className,
                value <= 500 ? 'text-neutral-950' : 'text-neutral-50',
              )}
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
        <div className='flex flex-col gap-1'>
          {['neutral', ...hues].map((hue) => (
            <div key={hue} className='grid grid-cols-[8rem_8rem]'>
              <div>
                <span className='dx-tag' data-hue={hue}>
                  {hue}
                </span>
              </div>
              <div>
                <span className='dx-text-hue text-sm' data-hue={hue}>
                  {hue}
                </span>
              </div>
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
              'p-form-padding w-card-min-width grid grid-cols-[min-content_1fr_min-content]',
            )}
          >
            <span className='animate-blink text-error-text'>*</span>
            <span className='text-center'>experimental</span>
            <span className='animate-blink text-error-text'>*</span>
          </div>
        </div>
      </div>
    );
  },
};
