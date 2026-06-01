//
// Copyright 2025 DXOS.org
//

import { type Meta } from '@storybook/react-vite';
import React, { type CSSProperties, useLayoutEffect, useRef, useState } from 'react';

import { hueShades, hues } from './defs';
import { mx } from './util';

// prettier-ignore
const neutralShades: [number, string][] = [
  [50,  'bg-neutral-50'],
  [75,  'bg-neutral-75'],
  [100, 'bg-neutral-100'],
  [125, 'bg-neutral-125'],
  [150, 'bg-neutral-150'],
  [200, 'bg-neutral-200'],
  [225, 'bg-neutral-225'],
  [250, 'bg-neutral-250'],
  [300, 'bg-neutral-300'],
  [400, 'bg-neutral-400'],
  [500, 'bg-neutral-500'],
  [575, 'bg-neutral-575'],
  [600, 'bg-neutral-600'],
  [700, 'bg-neutral-700'],
  [730, 'bg-neutral-730'],
  [750, 'bg-neutral-750'],
  [760, 'bg-neutral-760'],
  [775, 'bg-neutral-775'],
  [800, 'bg-neutral-800'],
  [825, 'bg-neutral-825'],
  [850, 'bg-neutral-850'],
  [875, 'bg-neutral-875'],
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
          backgroundColor: `var(--color-base-surface)`,
          color: `var(--color-${hue}-text)`,
        }}
        className='p-2 text-sm'
      >
        {hue}
      </div>
      <div
        style={{
          backgroundColor: `var(--color-${hue}-fill)`,
          color: `var(--color-${hue}-text)`,
        }}
        className='px-1 text-sm flex items-center'
      >
        <svg className='h-6 w-6'>
          <use href='/icons.svg#ph--aperture--regular' />
        </svg>
      </div>
      <div
        style={{
          backgroundColor: `var(--color-${hue}-surface)`,
          color: `var(--color-${hue}-foreground)`,
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

export const Primary = {
  render: () => {
    const [shift, setShift] = useState(180);
    // CSSProperties does not type custom properties; cast at this boundary. The shift is unitless
    // degrees because the OKLCH relative-color `h` channel resolves to a number.
    const style = { '--dx-secondary-hue-shift': `${shift}` } as CSSProperties;
    return (
      <div className='p-4 flex flex-col gap-4' style={style}>
        <label className='flex items-center gap-3 text-sm text-base-foreground'>
          <span className='w-40'>--dx-secondary-hue-shift: {shift}°</span>
          <input
            type='range'
            min={-180}
            max={180}
            value={shift}
            onChange={(event) => setShift(Number(event.target.value))}
            className='w-96'
          />
        </label>
        <div className='flex flex-col gap-3'>
          {(['primary', 'secondary'] as const).map((hue) => (
            <div key={hue} className='flex flex-col gap-1'>
              <span className='text-sm text-description'>{hue}</span>
              <HueSwatch hue={hue} shades={hueShades} />
            </div>
          ))}
        </div>
      </div>
    );
  },
};

// prettier-ignore
const surfaces: [surface: string, foreground: string, label: string][] = [
  // Sorted lightest -> darkest at runtime (see Surfaces story); surfaces without a dedicated
  // foreground fall back to base-foreground.
  ['bg-base-surface',    'text-base-foreground',     'base'],
  ['bg-deck-surface',    'text-base-foreground',     'deck'],
  ['bg-card-surface',    'text-base-foreground',     'card'],
  ['bg-toolbar-surface', 'text-base-foreground',     'toolbar'],
  ['bg-sidebar-surface', 'text-base-foreground',     'sidebar'],
  ['bg-group-surface',   'text-base-foreground',     'group'],
  ['bg-header-surface',  'text-base-foreground',     'header'],
  ['bg-modal-surface',   'text-base-foreground',     'modal'],
  ['bg-l1-surface',      'text-base-foreground',     'l1'],
  ['bg-r1-surface',      'text-base-foreground',     'r1'],
  ['bg-hover-surface',   'text-hover-foreground',    'hover'],
  ['bg-current-surface', 'text-current-foreground',  'current'],
  ['bg-selected-surface','text-selected-foreground', 'selected'],
  ['bg-l0-surface',      'text-base-foreground',     'l0'],
  ['bg-r0-surface',      'text-base-foreground',     'r0'],
  ['bg-input-surface',   'text-input-foreground',    'input'],
  ['bg-inverse-surface', 'text-inverse-foreground',  'inverse'],
  ['bg-scrim-surface',   'text-base-foreground',     'scrim'],
];

// Resolve any CSS color (oklch, light-dark(), rgb, ...) to a 0-1 luminance via a 1x1 canvas.
const colorLuminance = (css: string): number => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return 0;
  }
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

export const Surfaces = {
  render: () => {
    const rowRefs = useRef(new Map<string, HTMLDivElement>());
    const [order, setOrder] = useState(surfaces);
    useLayoutEffect(() => {
      // Sort lightest -> darkest by the resolved background; re-runs when the theme toggles.
      const sort = () => {
        const ranked = surfaces
          .map((row) => {
            const element = rowRefs.current.get(row[2]);
            return { row, luminance: element ? colorLuminance(getComputedStyle(element).backgroundColor) : 0 };
          })
          .sort((a, b) => b.luminance - a.luminance)
          .map(({ row }) => row);
        setOrder(ranked);
      };
      sort();
      const observer = new MutationObserver(sort);
      observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class', 'style', 'data-theme'] });
      return () => observer.disconnect();
    }, []);
    return (
      <div className='absolute inset-0 overflow-auto bg-white dark:bg-black'>
        <div className='flex flex-col'>
          {order.map(([surface, foreground, label]) => (
            <div
              key={label}
              ref={(element) => {
                if (element) {
                  rowRefs.current.set(label, element);
                }
              }}
              className={mx('flex items-baseline justify-between px-4 py-3', surface, foreground)}
            >
              <span className='text-sm'>{label}</span>
              <span className='text-xs opacity-60'>
                {surface} · {foreground}
              </span>
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
                <span className='dx-text text-sm' data-hue={hue}>
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
        <div className='dx-density-lg border border-separator rounded-md'>
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
