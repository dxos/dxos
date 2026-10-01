//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { type CallMetadata, log } from '@dxos/log';
import { random } from '@dxos/random';
import { Next } from '@dxos/react-ui';
import { ViewStateProvider } from '@dxos/react-ui-attention';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Logger } from './Logger.tsx';

random.seed(123);

// Full workspace paths so rows and the Levels popover show the derived package name.
const FILES = [
  'packages/ui/react-ui-debug/src/alpha.ts',
  'packages/plugins/plugin-inbox/src/beta.ts',
  'packages/core/echo/echo/src/gamma.ts',
];

// Hand-written meta so entries appear to originate from distinct files, populating the Levels list.
// A `seq`/`file` context is attached so expanding a row shows real structured content.
let seq = 0;
const emit = (file: string, level: 'info' | 'warn' | 'error') => {
  const meta: CallMetadata = { F: file, L: 1, S: undefined };
  // Attach a real Error at error level so the expanded row shows a stack trace.
  const context =
    level === 'error' ? { seq: ++seq, file, error: new Error('Simulated failure') } : { seq: ++seq, file };
  log[level](random.lorem.sentences(), context, meta);
};

const DefaultStory = () => (
  <ViewStateProvider>
    <Logger.Root initialFilter='info'>
      <Next.Panel.Root>
        <Next.Panel.Header>
          <Next.Toolbar.Root>
            {FILES.map((file) => (
              <Next.Button key={file} onClick={() => emit(file, 'info')}>
                {file.split('/').pop()}
              </Next.Button>
            ))}
            <Next.Button onClick={() => emit(FILES[1], 'warn')}>Warn (beta)</Next.Button>
            <Next.Button onClick={() => emit(FILES[1], 'error')}>Error (beta)</Next.Button>
          </Next.Toolbar.Root>
        </Next.Panel.Header>
        <Next.Panel.Body asChild>
          <Next.Panel.Root>
            <Next.Panel.Header>
              <Logger.Toolbar />
            </Next.Panel.Header>
            <Next.Panel.Body asChild>
              <Logger.Content>
                <Logger.List />
              </Logger.Content>
            </Next.Panel.Body>
            <Next.Panel.Footer>
              <Logger.Filter />
            </Next.Panel.Footer>
          </Next.Panel.Root>
        </Next.Panel.Body>
      </Next.Panel.Root>
    </Logger.Root>
  </ViewStateProvider>
);

const meta = {
  title: 'ui/react-ui-debug/Logger',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
