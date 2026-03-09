//
// Copyright 2023 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, forwardRef } from 'react';

import { useClassName } from '@dxos/ui-theme';
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
  ({ children, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const { className, ...rest } = useClassName(props);
    return (
      <Root {...rest} className={className} data-outer='true' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

// Middle primitive (like Dialog.Trigger or Mosaic.Cell).
const Middle = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Root = asChild ? Slot : 'div';
    const { className, ...rest } = useClassName(props);
    return (
      <Root {...rest} className={className} data-middle='true' ref={forwardedRef}>
        {children}
      </Root>
    );
  },
);

// Leaf component (like Card.Root).
const Leaf = forwardRef<HTMLButtonElement, SlottableClassName<PropsWithChildren>>(
  ({ children, ...props }, forwardedRef) => {
    const { className, ...rest } = useClassName(props);
    return (
      <button {...rest} className={className} ref={forwardedRef}>
        {children}
      </button>
    );
  },
);

// Test 1: Single asChild.
const TestSingle = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = useClassName(props);
  return (
    <Outer asChild {...rest} className={className}>
      <Leaf>Single asChild</Leaf>
    </Outer>
  );
};

// Test 2: Nested asChild.
const TestNested = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = useClassName(props);
  return (
    <Outer asChild {...rest} className={className}>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  );
};

// Test 3: Complex.
const TestInner = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = useClassName(props);
  return (
    <Outer asChild {...rest} className={className}>
      <Middle asChild>
        <Leaf>
          <div role='none'>Leaf</div>
        </Leaf>
      </Middle>
    </Outer>
  );
};

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
  render: () => <TestSingle role='listitem' classNames='border-red-500' />,
};

export const Nested: Story = {
  render: () => <TestNested role='listitem' classNames='border-green-500' />,
};

export const Inner: Story = {
  render: () => <TestInner role='listitem' classNames='border-blue-500' />,
};
