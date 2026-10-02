//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing/index.ts';
import { withLayoutVariants } from '../../testing/index.ts';
import * as Icon from '../Icon/Icon.tsx';
import * as Button from './Button.tsx';

const DefaultStory = ({ children, ...args }: Omit<Button.RootProps, 'ref'>) => {
  return (
    <div className='flex items-center gap-2'>
      <Button.Root {...args}>{children}</Button.Root>
      <Button.Root {...args} disabled>
        {children}
      </Button.Root>
      {(args.variant === 'default' || args.variant === 'primary') && (
        <Button.Group>
          <Button.Root {...args}>
            <Icon.Root icon='ph--caret-left--regular' />
          </Button.Root>
          <Button.Root {...args}>
            <Icon.Root icon='ph--caret-right--regular' />
          </Button.Root>
        </Button.Group>
      )}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Button',
  component: Button.Root,
  render: DefaultStory,
  decorators: [withTheme(), withLayoutVariants()],
} satisfies Meta<typeof Button.Root>;

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
