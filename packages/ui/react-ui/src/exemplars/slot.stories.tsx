//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren } from 'react';

import { composable, composableProps, slottable } from '@dxos/ui-theme';

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

/** This isn't a valid child for a slottable component. */
const Simple = ({ children }: PropsWithChildren) => <div role='none'>{children}</div>;

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
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-red-500 rounded' priority={1}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  ),
};

export const Nested: Story = {
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-green-500 rounded'>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  ),
};

export const Inner: Story = {
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-blue-500 rounded'>
      <Middle asChild>
        <Leaf>
          <div role='none'>Leaf</div>
        </Leaf>
      </Middle>
    </Outer>
  ),
};

export const Error: Story = {
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-green-500 rounded'>
      <Middle asChild>
        <Simple>Simple</Simple>
      </Middle>
    </Outer>
  ),
};
