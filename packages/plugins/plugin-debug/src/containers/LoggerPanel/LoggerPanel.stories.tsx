//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type CallMetadata, log } from '@dxos/log';
import { random } from '@dxos/random';
import { Toolbar } from '@dxos/react-ui';
import { withAttention } from '@dxos/react-ui-attention/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { LoggerPanel } from './LoggerPanel';

random.seed(123);

// Workspace-relative paths so rows and the Levels popover show a derived package name.
const FILES = [
  'packages/plugins/plugin-debug/src/alpha.ts',
  'packages/ui/react-ui-debug/src/beta.ts',
  'packages/core/echo/echo/src/gamma.ts',
];

let seq = 0;

const emit = (file: string, level: 'info' | 'warn' | 'error') => {
  // Hand-written meta so entries appear to originate from distinct files, populating the Levels list.
  const callMeta: CallMetadata = { F: file, L: 1, S: undefined };
  const context =
    level === 'error' ? { seq: ++seq, file, error: new Error('Simulated failure') } : { seq: ++seq, file };
  log[level](random.lorem.sentences(), context, callMeta);
};

/** The panel reads the process-wide log buffer, so the story emits into it rather than passing rows. */
const Render = () => (
  <div className='grid grid-rows-[min-content_1fr] h-[24rem] w-[48rem] max-w-full'>
    <Toolbar.Root>
      <Toolbar.Button onClick={() => emit(FILES[0], 'info')}>Info</Toolbar.Button>
      <Toolbar.Button onClick={() => emit(FILES[1], 'warn')}>Warn</Toolbar.Button>
      <Toolbar.Button onClick={() => emit(FILES[2], 'error')}>Error</Toolbar.Button>
    </Toolbar.Root>
    <LoggerPanel />
  </div>
);

const meta = {
  title: 'plugins/plugin-debug/containers/LoggerPanel',
  component: LoggerPanel,
  render: Render,
  decorators: [withAttention(), withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof LoggerPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
