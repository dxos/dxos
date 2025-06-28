//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

type TestProps = {
  onClick: () => void;
};

const Test = ({ onClick }: TestProps) => (
  <button className='p-2' onClick={onClick}>
    Test
  </button>
);

const meta: Meta<TestProps> = {
  title: 'ui/react-ui-form/Test',
  component: Test,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<TestProps>;

export const Default: Story = {
  // TODO(burdon): Race condition on first load?
  play: async ({ args, canvasElement }: any) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button'));
    await expect(args.onClick).toHaveBeenCalled();
  },
  args: {
    onClick: fn(),
  },
};
