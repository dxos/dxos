//
// Copyright 2023 DXOS.org
//

import { ark } from '@ark-ui/react/factory';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { PropsWithChildren } from 'react';

import { mx } from '@dxos/ui-theme';

import { withTheme } from '../testing';
import { composable, composableProps, slottable } from '../util';
import { ThemedClassName } from '../util';

/**
 * `asChild` composition.
 * Every part that renders a DOM element accepts an `asChild` prop. When it is set, the part renders
 * no element of its own and instead clones its child, passing it the props and behaviour it needs.
 * https://ark-ui.com/docs/guides/composition
 */

const Outer = slottable<HTMLDivElement, { priority?: number }>(
  ({ children, asChild, priority, ...props }, forwardedRef) => {
    return (
      <ark.div
        asChild={asChild}
        {...composableProps<HTMLDivElement>(props, { classNames: 'p-2 border border-red-500 rounded' })}
        ref={forwardedRef}
      >
        {children}
      </ark.div>
    );
  },
);

const Middle = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  return (
    <ark.div
      asChild={asChild}
      {...composableProps<HTMLDivElement>(props, { classNames: 'p-2 border border-red-500 rounded' })}
      ref={forwardedRef}
    >
      {children}
    </ark.div>
  );
});

const Leaf = composable<HTMLButtonElement>(({ children, ...props }, forwardedRef) => {
  return (
    <button
      {...composableProps<HTMLButtonElement>(props, { classNames: 'p-2 border border-red-500 rounded' })}
      ref={forwardedRef}
    >
      {children}
    </button>
  );
});

/** This isn't a valid child for a `slottable` component. */
const Simple = ({ children, classNames }: ThemedClassName<PropsWithChildren>) => (
  <div className={mx(classNames)}>{children}</div>
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
  render: () => (
    <Outer asChild role='article' classNames='border-green-500' priority={1}>
      <Leaf>Single asChild (non-compliant — see console)</Leaf>
    </Outer>
  ),
};

export const Nested: Story = {
  render: () => (
    <Outer asChild role='article' classNames='border-blue-500'>
      <Middle asChild>
        <Leaf>Nested asChild</Leaf>
      </Middle>
    </Outer>
  ),
};

export const Inner: Story = {
  render: () => (
    <Outer asChild role='article' classNames='border-orange-500'>
      <Middle asChild>
        <Leaf>
          <div>Leaf</div>
        </Leaf>
      </Middle>
    </Outer>
  ),
};

export const Error: Story = {
  render: () => (
    <Outer asChild classNames='p-2 border border-green-500 rounded'>
      <Middle asChild>
        <Simple>Simple</Simple>
      </Middle>
    </Outer>
  ),
};
