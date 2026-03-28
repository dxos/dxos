//
// Copyright 2023 DXOS.org
//

import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren } from 'react';

<<<<<<< HEAD
import { composable, composableProps, mx, slottable } from '@dxos/ui-theme';
||||||| 485aab8d40
import { composableProps } from '@dxos/ui-theme';
import { type ComposableProps, type SlottableProps, type ThemedClassName } from '@dxos/ui-types';
=======
import { composable, composableProps, slottable } from '@dxos/ui-theme';
>>>>>>> origin/main

import { withTheme } from '../testing';
<<<<<<< HEAD
import { ThemedClassName } from '../util';
||||||| 485aab8d40
import { Slot } from '@radix-ui/react-slot';
=======
>>>>>>> origin/main

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
      <Comp
        {...composableProps<HTMLDivElement>(props, { role: 'none', className: 'p-2 border border-red-500 rounded' })}
        ref={forwardedRef}
      >
        {children}
      </Comp>
    );
  },
);

<<<<<<< HEAD
const Middle = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp = asChild ? Slot : Primitive.div;
  return (
    <Comp
      {...composableProps<HTMLDivElement>(props, { role: 'none', className: 'p-2 border border-red-500 rounded' })}
      ref={forwardedRef}
    >
      {children}
    </Comp>
  );
});

const Leaf = composable<HTMLButtonElement>(({ children, ...props }, forwardedRef) => {
  return (
    <button
      {...composableProps<HTMLButtonElement>(props, { role: 'none', className: 'p-2 border border-red-500 rounded' })}
      ref={forwardedRef}
    >
      {children}
    </button>
  );
});

/** This isn't a valid child for a `slottable` component. */
const Simple = ({ children, classNames }: ThemedClassName<PropsWithChildren>) => (
  <div role='none' className={mx(classNames)}>
    {children}
  </div>
);
||||||| 485aab8d40
const Middle = forwardRef<HTMLDivElement, SlottableProps<HTMLDivElement>>(
  ({ children, asChild, ...props }, forwardedRef) => {
    const Comp = asChild ? Slot : Primitive.div;
    return (
      <Comp {...composableProps<HTMLDivElement>(props, { role: 'none' })} ref={forwardedRef}>
        {children}
      </Comp>
    );
  },
);

const Leaf = forwardRef<HTMLButtonElement, ComposableProps<HTMLButtonElement>>(
  ({ children, ...props }, forwardedRef) => {
    return (
      <button {...composableProps<HTMLButtonElement>(props, { role: 'none' })} ref={forwardedRef}>
        {children}
      </button>
    );
  },
);

const TestSingle = (props: ThemedClassName<{ role?: string }>) => {
  return (
    <Outer asChild {...composableProps<HTMLDivElement>(props, { role: 'none' })}>
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
=======
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
>>>>>>> origin/main

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
<<<<<<< HEAD
  render: () => (
    <Outer asChild role='article' classNames='border-green-500' priority={1}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  ),
||||||| 485aab8d40
  render: () => <TestSingle role='listitem' classNames='border-red-500' />,
=======
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-red-500 rounded' priority={1}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  ),
>>>>>>> origin/main
};

export const Nested: Story = {
<<<<<<< HEAD
  render: () => (
    <Outer asChild role='article' classNames='border-blue-500'>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  ),
||||||| 485aab8d40
  render: () => <TestNested role='listitem' classNames='border-green-500' />,
=======
  render: () => (
    <Outer asChild role='none' classNames='p-2 border border-green-500 rounded'>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  ),
>>>>>>> origin/main
};

export const Inner: Story = {
<<<<<<< HEAD
  render: () => (
    <Outer asChild role='article' classNames='border-orange-500'>
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
||||||| 485aab8d40
  render: () => <TestInner role='listitem' classNames='border-blue-500' />,
=======
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
>>>>>>> origin/main
};
