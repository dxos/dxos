//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactElement, type Ref, forwardRef } from 'react';

import { type SlottableProps } from '@dxos/ui-types';

import { withTheme } from '../testing';

const ComponentInner = forwardRef<HTMLDivElement, ComponentProps>(({ children, ...props }, forwardedRef) => {
  return (
    <div {...props} ref={forwardedRef}>
      {children}
    </div>
  );
});

ComponentInner.displayName = 'Component';

/**
 * Generic component pattern.
 */
type ComponentProps<P extends HTMLElement = any> = SlottableProps<P>;

const Component = ComponentInner as <P extends HTMLElement>(
  props: SlottableProps<P> & { ref?: Ref<P> },
) => ReactElement;

const meta = {
  title: 'ui/react-ui-core/exemplars/generics',
  component: Component,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {};
