//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { withSurfaceVariantsLayout } from '../../testing';
import { Icon } from '../Icon';

import { Button, ButtonGroup, type ButtonProps } from './Button';

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

const meta = {
  title: 'ui/react-ui-core/Button',
  component: Button,
  render: DefaultStory,
  decorators: [withTheme, withSurfaceVariantsLayout()],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

const defaults: Story['args'] = { children: 'Test' };

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
