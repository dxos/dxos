//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React from 'react';

import { hues } from './tokens';
import { mx } from './util';

const Swatch = ({ hue }: { hue: string }) => (
  <div
    className='shrink-0 aspect-square w-24 flex flex-col overflow-hidden border rounded-sm'
    style={{
      background: `var(--color-${hue}-surface)`,
      borderColor: `var(--color-${hue}-fill)`,
    }}
  >
    <span
      className='text-sm p-2'
      style={{
        color: `var(--color-${hue}-surface-text)`,
      }}
    >
      {hue}
    </span>
  </div>
);

const meta = {
  title: 'ui/ui-theme/Tokens',
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

export const Surfaces = {
  render: () => {
    return (
      <div className='p-4'>
        <div className='flex flex-wrap gap-2'>
          {[
            { className: 'bg-inverse-surface', label: 'inverse' },
            { className: 'bg-base-surface', label: 'base' },
            { className: 'bg-scrim-surface', label: 'scrim' },
            { className: 'bg-deck-surface', label: 'deck' },
            { className: 'bg-modal-surface', label: 'modal' },
            { className: 'bg-group-surface', label: 'group' },
            { className: 'bg-input-surface', label: 'input' },
            { className: 'bg-sidebar-surface', label: 'sidebar' },
            { className: 'bg-header-surface', label: 'header' },
            { className: 'bg-active-surface', label: 'active' },
            { className: 'bg-card-surface', label: 'card' },
          ].map(({ className, label }) => (
            <div
              key={className}
              className={mx(
                'shrink-0 p-2 aspect-square w-48 border-2 border-neutral-50 dark:border-neutral-950',
                className,
              )}
            >
              {label}
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
