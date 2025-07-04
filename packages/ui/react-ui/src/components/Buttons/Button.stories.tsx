//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { type StoryObj, type Meta } from '@storybook/react-vite';
import React from 'react';

import { Button, ButtonGroup, type ButtonProps } from './Button';
import { withSurfaceVariantsLayout, withTheme } from '../../testing';

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
            <CaretLeft />
          </Button>
          <Button {...args}>
            <CaretRight />
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
};

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
