//
// Copyright 2026 DXOS.org
//

// Gallery for the `px` set: the working surface for drawing an icon and the check that it survived
// the sprite build. Icons are read from `PxIcons` rather than listed here, so a new entry appears
// without touching this file — the literals the sprite scanner needs come from `src/index.ts`,
// which every host lists in `scanPaths`.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Icon } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { getSize } from '@dxos/ui-theme';

import { PxIcons } from './index.ts';

// The sizes an icon actually has to survive: a toolbar button down to inline text.
const sizes = [16, 12, 8, 6, 5, 4] as const;

/** Phosphor glyphs shown beside the set, to catch weight or inset drift by eye. */
const reference = ['ph--circle--regular', 'ph--github-logo--regular', 'ph--google-logo--regular'];

/**
 * One row per symbol, each size wrapped in a box that hugs the icon so the dashes show that size's
 * bounds. Two things read off it: whether the glyph fills its box like its Phosphor neighbours, and
 * whether it is there at all — a symbol missing from the sprite renders nothing, indistinguishable
 * from an empty cell without a boundary to see.
 */
const Row = ({ symbol }: { symbol: string }) => (
  <div className='flex items-center gap-4'>
    <div className='w-56 shrink-0 font-mono text-xs text-subdued'>{symbol}</div>
    {sizes.map((size) => (
      // The slot keeps columns aligned across rows; the inner box takes its size from the icon.
      <div key={size} className='grid w-20 place-items-center'>
        <div className='inline-flex border border-dashed border-separator'>
          <Icon icon={symbol} classNames={getSize(size)} />
        </div>
      </div>
    ))}
  </div>
);

const Group = ({ symbols, title }: { symbols: string[]; title: string }) => (
  <div className='flex flex-col gap-2'>
    <h2 className='text-sm uppercase tracking-wide text-subdued'>{title}</h2>
    {symbols.map((symbol) => (
      <Row key={symbol} symbol={symbol} />
    ))}
  </div>
);

const Gallery = ({ symbols = Object.values(PxIcons) }: { symbols?: string[] }) => (
  <div className='flex flex-col gap-8'>
    <Group title='px (this package)' symbols={symbols} />
    <Group title='ph (reference)' symbols={reference} />
  </div>
);

const meta = {
  title: 'ui/ui-icons/Icons',
  component: Gallery,
  decorators: [withTheme(), withLayout({ scroll: true, classNames: 'p-8' })],
} satisfies Meta<typeof Gallery>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * Icons at text size, in a line of prose — where a stroke that is too light or an inset that is too
 * tight shows up first.
 */
export const Inline: Story = {
  render: () => (
    <div className='flex flex-col gap-4 text-base'>
      {Object.values(PxIcons).map((symbol) => (
        <p key={symbol} className='flex items-center gap-2'>
          <Icon icon={symbol} />
          <span>The quick brown fox — {symbol}</span>
        </p>
      ))}
    </div>
  ),
};
