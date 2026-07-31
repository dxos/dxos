//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { ThemeProvider, useThemeContext } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import m1 from './fixtures/m1.html?raw';
import m2 from './fixtures/m2.html?raw';
import { HtmlViewer } from './HtmlViewer';

// Real captured mail (see the MailboxSync story's Archive panel). Unlike the hand-written samples in
// `HtmlViewer.stories.tsx` these carry the things that actually break rendering: sender stylesheets,
// nested layout tables, and explicit `color-scheme` declarations.
const FIXTURES: { name: string; html: string; note: string }[] = [
  { name: 'm1', html: m1, note: 'Table layout, one sender stylesheet, no color-scheme declaration.' },
  { name: 'm2', html: m2, note: 'Declares color-scheme: light — the sender states it has no dark rendering.' },
];

/**
 * One fixture rendered in a fixed theme, regardless of the storybook theme global. Both the DOM class
 * (which resolves the `--color-*` custom properties the recolor transform probes) and the React
 * `ThemeProvider` are pinned, since `HtmlViewer` reads the mode from context but `readThemeParams`
 * reads the computed values off the DOM.
 */
const ThemePane = ({ mode, html, isPersonal }: { mode: 'light' | 'dark'; html: string; isPersonal?: boolean }) => {
  const { tx } = useThemeContext();
  return (
    <div className={mode}>
      <ThemeProvider tx={tx} themeMode={mode}>
        <div className='bg-baseSurface text-baseText p-2 overflow-auto'>
          <div className='pb-1 text-xs uppercase tracking-wide text-description'>{mode}</div>
          <HtmlViewer html={html} isPersonal={isPersonal} />
        </div>
      </ThemeProvider>
    </div>
  );
};

type StoryProps = {
  /** Renders every fixture as `isPersonal`, forcing the recolor path that table layouts otherwise skip. */
  isPersonal?: boolean;
};

// Side by side rather than one theme at a time: the failure mode is a body that reads fine in one mode
// and is illegible in the other, which is only obvious when both are on screen together.
const DefaultStory = ({ isPersonal }: StoryProps) => (
  <div className='flex flex-col gap-4 p-2'>
    {FIXTURES.map(({ name, html, note }) => (
      <div key={name} className='flex flex-col gap-1'>
        <div className='text-sm font-medium'>{name}</div>
        <div className='text-xs text-description'>{note}</div>
        <div className='grid grid-cols-2 gap-2 border border-separator rounded overflow-hidden'>
          <ThemePane mode='light' html={html} isPersonal={isPersonal} />
          <ThemePane mode='dark' html={html} isPersonal={isPersonal} />
        </div>
      </div>
    ))}
  </div>
);

const meta = {
  title: 'plugins/plugin-inbox/components/HtmlViewer/fixtures',
  component: DefaultStory,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** As delivered: table layouts are left as authored, so only the app-surface bleed-through shows. */
export const Default: Story = { args: { isPersonal: false } };

/** Forces the recolor transform onto the same bodies, to judge it against real sender markup. */
export const Themed: Story = { args: { isPersonal: true } };
