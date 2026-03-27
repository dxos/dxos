//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { composable, composableProps, slottable } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { withTheme } from '../testing';

/**
 * Radix-style composition.
 * All Radix primitive parts that render a DOM element accept an asChild prop.
 * When asChild is set to true, Radix will not render a default DOM element,
 * instead cloning the part's child and passing it the props and behavior required to make it functional.
 * https://www.radix-ui.com/primitives/docs/guides/composition
 */

const Outer = slottable<HTMLDivElement, { priority?: number }>(
  ({ children, asChild, priority, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...composableProps<HTMLDivElement>(props, { role: 'none' })} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

const Middle = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp {...composableProps<HTMLDivElement>(props, { role: 'none' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

const Leaf = composable<HTMLButtonElement>(({ children, ...props }, forwardedRef) => {
  return (
    <button {...composableProps<HTMLButtonElement>(props, { role: 'none' })} ref={forwardedRef}>
      {children}
    </button>
  );
});

const TestSingle = (props: ThemedClassName<{ role?: string }>) => {
  return (
    <Outer {...composableProps<HTMLDivElement>(props, { role: 'none' })} asChild priority={1}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  );
};

const TestNested = (props: ThemedClassName<{ role?: string }>) => {
  return (
    <Outer asChild {...composableProps<HTMLDivElement>(props, { role: 'none' })}>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  );
};

const TestInner = (props: ThemedClassName<{ role?: string }>) => {
  return (
    <Outer asChild {...composableProps<HTMLDivElement>(props, { role: 'none' })}>
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
