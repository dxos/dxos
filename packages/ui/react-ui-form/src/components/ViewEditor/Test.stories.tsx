//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react';
import { within, userEvent, expect, fn } from '@storybook/test';
import React from 'react';

// TODO(burdon): Need node exports.
import { withTheme } from '@dxos/storybook-utils';

// https://storybook.js.org/blog/storybook-test
// https://github.com/storybookjs/storybook/tree/next/code/lib/test

// TODO(burdon): Set-up: https://www.chromatic.com/storybook

export type TestProps = {
  onClick: () => void;
};

export const Test = ({ onClick }: TestProps) => (
  <button className='p-2' onClick={onClick}>
    Test
  </button>
);

export const Primary: StoryObj<TestProps> = {
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

const meta: Meta = {
  title: 'ui/react-ui-form/Test',
  component: Test,
  decorators: [withTheme],
};

export default meta;
