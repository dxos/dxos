//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { withTheme } from '@dxos/storybook-utils';

import { Test, type TestProps } from './Test';

const meta: Meta<TestProps> = {
  title: 'ui/react-ui-editor/Test',
  component: Test,
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
    label: 'Test',
    onClick: fn(),
  },
};
