//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { log } from '@dxos/log';
import { withTheme } from '@dxos/storybook-utils';

import { Test, type TestProps } from './Test';
import { TEST_ID } from './defs';

/**
 * Storybook sanity test.
 */
const meta: Meta<TestProps> = {
  title: 'devtools/storybook-utils/Test',
  component: Test,
  render: (args) => <Test {...{ 'data-testid': TEST_ID }} {...args} />,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<TestProps>;

export const Default: Story = {
  // Interactions tab.
  // https://storybook.js.org/docs/writing-stories/play-function?renderer=react#writing-stories-with-the-play-function
  play: async ({ args, canvasElement }: any) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
    await expect(canvas.getByText(args.label)).toBeInTheDocument();
  },
  args: {
    variant: 'primary',
    icon: 'ph--rocket-launch--regular',
    label: 'Composer',
    onClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        component: 'A basic button component.',
      },
    },
  },
};

export const WithLog: Story = {
  args: {
    icon: 'ph--rocket-launch--regular',
    label: 'Test',
    onClick: () => {
      log.info('Hello, world!');
    },
  },
};
