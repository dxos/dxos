//
// Copyright 2023 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, forwardRef } from 'react';

import { withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

// Outer primitive (like Tooltip.Trigger or Focus.Group).
const Outer = forwardRef<HTMLDivElement, { children: ReactNode; className?: string; asChild?: boolean; role?: string }>(
  (props, ref) => {
    const { children, className, asChild, ...rest } = props;
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp {...rest} className={mx('p-2', className)} data-outer='true' ref={ref}>
        {children}
      </Comp>
    );
  },
);

// Middle primitive (like Dialog.Trigger or Mosaic.Cell).
const Middle = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; asChild?: boolean; role?: string }
>((props, ref) => {
  const { children, className, asChild, ...rest } = props;
  const Comp = asChild ? Slot : 'div';
  return (
    <Comp {...rest} className={mx('p-2', className)} data-middle='true' ref={ref}>
      {children}
    </Comp>
  );
});

// Leaf component (like MyButton or Card.Root).
const Leaf = forwardRef<HTMLButtonElement, { children: ReactNode; className?: string; role?: string }>(
  ({ className, ...props }, ref) => {
    return (
      <button className={mx('p-2 outline-none border rounded', className)} {...props} ref={ref}>
        {props.children}
      </button>
    );
  },
);

// Test 1: Single asChild (should work).
const TestSingle = (props: { className?: string; role?: string }) => (
  <Outer asChild {...props}>
    <Leaf>Single asChild</Leaf>
  </Outer>
);

// Test 2: Nested asChild (like Radix docs example).
const TestNested = (props: { className?: string; role?: string }) => {
  return (
    <Outer asChild {...props}>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  );
};

// Test 3: Our actual pattern.
const TestInner = (props: { className?: string; role?: string }) => (
  <Outer asChild {...props}>
    <Middle asChild>
      <Leaf>
        <div>Leaf</div>
      </Leaf>
    </Middle>
  </Outer>
);

const meta = {
  title: 'ui/react-ui-mosaic/Slot',
  decorators: [withTheme],
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
