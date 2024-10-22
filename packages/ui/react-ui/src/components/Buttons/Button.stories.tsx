//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React from 'react';

import { Button, ButtonGroup, type ButtonProps } from './Button';
import { withVariants, withTheme } from '../../testing';

const Story = ({ children, ...args }: Omit<ButtonProps, 'ref'>) => {
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

export default {
  title: 'react-ui/Button',
  component: Button,
  decorators: [withVariants(), withTheme],
  render: Story,
  parameters: { chromatic: { disableSnapshot: false } },
};

const defaults = { children: 'Test' };

export const Default = {
  args: { ...defaults, variant: 'default' },
};

export const Primary = {
  args: { ...defaults, variant: 'primary' },
};

export const Destructive = {
  args: { ...defaults, variant: 'destructive' },
};

export const Outline = {
  args: { ...defaults, variant: 'outline' },
};

export const Ghost = {
  args: { ...defaults, variant: 'ghost' },
};
