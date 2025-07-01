//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withThemeEditor } from '@dxos/storybook-utils';

import { Test, type TestProps } from './Test';
import { log } from '@dxos/log';

/**
 * Storybook sanity test.
 */
const meta: Meta<TestProps> = {
  title: 'apps/composer-app/Test',
  component: Test,
  decorators: [withThemeEditor],
  // parameters: {
  //   layout: 'centered',
  // },
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
}
