//
// Copyright 2023 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type SlottableClassName, type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

import { withTheme } from '../testing';

/**
 * Composition
 *
 * All Radix primitive parts that render a DOM element accept an asChild prop.
 * When asChild is set to true, Radix will not render a default DOM element, instead cloning the part's child and passing it the props and behavior required to make it functional.
 * https://www.radix-ui.com/primitives/docs/guides/composition
 */

// Outer primitive (like Tooltip.Trigger or Focus.Group).
const Outer = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
  ({ children, className, classNames, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} className={mx(className, classNames)} data-outer='true' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

// Middle primitive (like Dialog.Trigger or Mosaic.Cell).
const Middle = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
  ({ children, className, classNames, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    return (
      <Root {...props} className={mx(className, classNames)} data-middle='true' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

// Leaf component (like Card.Root).
const Leaf = forwardRef<HTMLButtonElement, SlottableClassName<PropsWithChildren>>(
  ({ className, classNames, children, ...props }, forwardedRef) => {
    return (
      <button {...props} className={mx('p-2 outline-none border rounded', className, classNames)} ref={forwardedRef}>
        {children}
      </button>
    );
  },
);

// Test 1: Single asChild.
const TestSingle = ({ classNames, ...props }: ThemedClassName<{ role?: string }>) => (
  <Outer asChild {...props} className={mx('p-2', classNames)}>
    <Leaf>Single asChild</Leaf>
  </Outer>
);

// Test 2: Nested asChild.
const TestNested = ({ classNames, ...props }: ThemedClassName<{ role?: string }>) => {
  return (
    <Outer asChild {...props} className={mx('p-2', classNames)}>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  );
};

// Test 3: Complex.
const TestInner = ({ classNames, ...props }: ThemedClassName<{ role?: string }>) => (
  <Outer asChild {...props} className={mx('p-2', classNames)}>
    <Middle asChild>
      <Leaf>
        <div role='none'>Leaf</div>
      </Leaf>
    </Middle>
  </Outer>
);

const meta = {
  title: 'ui/react-ui-core/exemplars/slot',
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => <TestSingle role='listitem' className='border-red-500' />,
};

export const Nested: Story = {
  render: () => <TestNested role='listitem' className='border-green-500' />,
};

export const Inner: Story = {
  render: () => <TestInner role='listitem' className='border-blue-500' />,
};
