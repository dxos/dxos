//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type PropsWithChildren, forwardRef } from 'react';

import { composableProps } from '@dxos/ui-theme';
import { type ComposableProps, type SlottableProps, type ThemedClassName } from '@dxos/ui-types';

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
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...rest} className={className} data-outer='true' ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

// Middle primitive (like Dialog.Trigger or Mosaic.Cell).
const Middle = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...rest} className={className} data-middle='true' ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

// Leaf component — NOT slot-compliant (no slotCompliant() wrapper).
const Leaf = forwardRef<HTMLButtonElement, ComposableProps<PropsWithChildren>>(
  ({ children, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    return (
      <button {...rest} className={className} ref={forwardedRef}>
        {children}
      </button>
    );
  },
);

const TestSingle = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Outer {...rest} asChild className={className}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  );
};

const TestNested = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Outer {...rest} asChild className={className}>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  );
};

const TestInner = (props: ThemedClassName<{ role?: string }>) => {
  const { className, ...rest } = composableProps(props);
  return (
    <Outer {...rest} asChild className={className}>
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
