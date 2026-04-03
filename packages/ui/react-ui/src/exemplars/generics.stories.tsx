//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { slottable } from '@dxos/ui-theme';

import { withTheme } from '../testing';

/**
 * Generic component pattern using the slottable factory.
 */
const Component = slottable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...props} ref={forwardedRef}>
      {children}
    </div>
  );
});

const meta = {
  title: 'ui/react-ui-core/exemplars/generics',
  component: Component,
  render: (props) => <Component {...props} />,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Hello',
  },
};
