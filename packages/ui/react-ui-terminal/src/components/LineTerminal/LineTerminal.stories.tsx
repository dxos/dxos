//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';
import { userEvent } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type TerminalBridge } from '../../cli/index.ts';
import { runCommand, waitForTerminal } from '../../testing.ts';
import { LineTerminal } from './LineTerminal.tsx';

const DefaultStory = () => {
  // Stands in for a remote shell: reverses each line after a short delay.
  const evaluate = useCallback(
    (line: string, bridge: TerminalBridge) =>
      Effect.sleep('200 millis').pipe(
        Effect.andThen(Effect.sync(() => bridge.write(`${[...line].reverse().join('')}\n`))),
      ),
    [],
  );

  return <LineTerminal evaluate={evaluate} banner='Each line comes back reversed.' />;
};

const meta = {
  title: 'ui/react-ui-terminal/LineTerminal',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Spec: Story = {
  play: async ({ canvasElement }) => {
    await waitForTerminal(canvasElement, '$');
    await runCommand(canvasElement, 'hello', userEvent.keyboard);
    await waitForTerminal(canvasElement, 'olleh');
  },
};
