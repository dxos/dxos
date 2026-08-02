//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type CSSProperties } from 'react';

import { mx } from './util';

/**
 * Composed elevation matrix: every semantic surface level nested the way the app nests them
 * (deck → chrome → canvas → card/toolbar → dialog → popover), with hover/current/selected
 * aspect samples on each surface. Toggle light/dark with the storybook theme switcher.
 *
 * The `proposed` ladder previews AUDIT.md decision D1 (chrome below base, card above base) by
 * overriding the named surface tokens inline. The `--dx-elevation-*` knobs cannot be overridden
 * from a descendant scope — custom-property substitution into the named tokens already ran at
 * `:root` — so the preview redefines the named tokens themselves.
 */

const chrome = 'light-dark(var(--color-neutral-250), var(--color-neutral-925))';

// D1: chrome (sidebar/topbar/rails) drops below the canvas; card rises above it; the toolbar
// reads as a bar one step above its host. Unchanged: deck, base, group/input, modal, popover.
const proposedOverrides = {
  '--color-card-surface': 'light-dark(var(--color-neutral-125), var(--color-neutral-850))',
  '--color-sidebar-surface': chrome,
  '--color-header-surface': chrome,
  '--color-l0-surface': chrome,
  '--color-l1-surface': chrome,
  '--color-r0-surface': chrome,
  '--color-r1-surface': chrome,
  '--color-toolbar-surface': 'light-dark(var(--color-neutral-100), var(--color-neutral-825))',
} as CSSProperties;

const Label = ({ children }: { children: string }) => (
  <span className='text-xs font-mono text-description select-none'>{children}</span>
);

/**
 * Aspect samples riding the surface-derived state tokens (hover/current/selected resolve off the
 * enclosing zone's `--surface-bg`), with the ARIA pairing required by `css/components/state.md`.
 */
const AspectRows = () => (
  <div className='flex flex-col text-sm rounded-sm'>
    <div className='dx-hover px-2 py-1 rounded-sm'>hover</div>
    <nav>
      <a href='#' aria-current='true' className='dx-hover dx-current block px-2 py-1 rounded-sm'>
        current
      </a>
    </nav>
    <ul role='listbox' aria-label='selection sample'>
      <li role='option' aria-selected='true' className='dx-hover dx-selected px-2 py-1 rounded-sm'>
        selected
      </li>
    </ul>
  </div>
);

const Frame = ({ title, style }: { title: string; style?: CSSProperties }) => (
  <section style={style} className='dx-deck-surface rounded-lg p-2 flex flex-col gap-1'>
    <div className='flex items-baseline justify-between px-1'>
      <span className='text-sm font-medium'>{title}</span>
      <Label>deck-surface</Label>
    </div>
    <div className='flex gap-2 min-h-[34rem]'>
      <aside className='dx-sidebar-surface w-56 shrink-0 rounded-md border border-separator p-2 flex flex-col gap-2'>
        <Label>sidebar-surface</Label>
        <AspectRows />
      </aside>
      <div className='flex-1 flex flex-col gap-2 min-w-0'>
        <header className='dx-header-surface h-10 shrink-0 rounded-md border border-separator flex items-center px-3'>
          <Label>header-surface (topbar)</Label>
        </header>
        <main className='dx-base-surface flex-1 rounded-md border border-separator p-3 flex flex-col gap-3'>
          <Label>base-surface</Label>
          <div className='dx-toolbar-surface h-10 shrink-0 rounded-sm flex items-center px-3'>
            <Label>toolbar-surface</Label>
          </div>
          <div className='flex flex-wrap gap-3 items-start'>
            <div className='dx-card-surface w-72 rounded-md border-2 border-separator p-3 flex flex-col gap-2'>
              <Label>card-surface</Label>
              <AspectRows />
              <div className='dx-group-surface rounded-sm p-2 flex flex-col gap-2'>
                <Label>group-surface</Label>
                <div className='dx-input-surface border border-input-separator rounded-xs px-2 py-1 text-sm text-placeholder'>
                  input-surface
                </div>
              </div>
            </div>
            <div className='dx-modal-surface w-80 rounded-md border border-separator p-3 flex flex-col gap-2 shadow-md'>
              <Label>modal-surface (dialog)</Label>
              <AspectRows />
              <div className='dx-popover-surface w-56 rounded-md border border-separator p-2 flex flex-col gap-1 shadow-lg self-end'>
                <Label>popover-surface</Label>
                <AspectRows />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </section>
);

type StoryProps = { ladder: 'current' | 'proposed' };

const meta = {
  title: 'ui/ui-theme/Elevation',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    ladder: { control: 'radio', options: ['current', 'proposed'] },
  },
  args: { ladder: 'current' },
  render: ({ ladder }: StoryProps) => (
    <div className={mx('absolute inset-0 overflow-auto p-2', 'bg-white dark:bg-black')}>
      <Frame
        title={ladder === 'proposed' ? 'Proposed (D1: chrome < base < card)' : 'Current (card < base < chrome)'}
        style={ladder === 'proposed' ? proposedOverrides : undefined}
      />
    </div>
  ),
} satisfies Meta<StoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Current: Story = {
  args: { ladder: 'current' },
};

export const ProposedD1: Story = {
  args: { ladder: 'proposed' },
};

export const Comparison: Story = {
  render: () => (
    <div className={mx('absolute inset-0 overflow-auto p-2 flex flex-col gap-4', 'bg-white dark:bg-black')}>
      <Frame title='Current (card < base < chrome)' />
      <Frame title='Proposed (D1: chrome < base < card)' style={proposedOverrides} />
    </div>
  ),
};
