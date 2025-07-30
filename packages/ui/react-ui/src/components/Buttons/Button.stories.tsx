//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, within, fn } from 'storybook/test';

import { Button, ButtonGroup, type ButtonProps } from './Button';
import { withSurfaceVariantsLayout, withTheme } from '../../testing';
import { Icon } from '../Icon';

const DefaultStory = ({ children, ...args }: Omit<ButtonProps, 'ref'>) => {
  return (
    <div>
      <Button {...args}>{children}</Button>
      <Button {...args} disabled>
        {children}
      </Button>
      {(args.variant === 'default' || args.variant === 'primary') && (
        <ButtonGroup>
          <Button {...args}>
            <Icon icon='ph--caret-left--regular' />
          </Button>
          <Button {...args}>
            <Icon icon='ph--caret-right--regular' />
          </Button>
        </ButtonGroup>
      )}
    </div>
  );
};

const meta: Meta<typeof Button> = {
  title: 'ui/react-ui-core/Button',
  component: Button,
  render: DefaultStory,
  decorators: [withSurfaceVariantsLayout(), withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
  tags: ['test'],
  play: async ({ args, canvasElement }: any) => {
    const canvas = within(canvasElement);
    const buttons = canvas.getAllByRole('button');
    await userEvent.click(buttons[0]);
    await expect(args.onClick).toHaveBeenCalled();
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const defaults: Story['args'] = { children: 'Test', onClick: fn() };

export const Default: Story = {
  args: { ...defaults, variant: 'default' },
};

export const Primary: Story = {
  args: { ...defaults, variant: 'primary' },
};

export const Destructive: Story = {
  args: { ...defaults, variant: 'destructive' },
};

export const Outline: Story = {
  args: { ...defaults, variant: 'outline' },
};

export const Ghost: Story = {
  args: { ...defaults, variant: 'ghost' },
};
