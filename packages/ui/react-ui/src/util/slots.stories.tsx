//
// Copyright 2026 DXOS.org
//

import { Slot } from '@radix-ui/react-slot';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, forwardRef } from 'react';

import { withLayout, withTheme } from '../testing/index.ts';
import { composable, composableProps, slottable } from './slots.ts';

//
// A slottable host and two candidate children: one built with `composable()`, one a plain
// `forwardRef`. Radix `Slot` merges its props into whichever child it is given, but a child that
// does not spread them drops the injected `className` and `ref` — silently, with no error and no
// type complaint. `slottable()` detects that in dev builds and marks the rendered element with
// `dx-slot-warning` (a dashed rose outline).
//

const Host = slottable<HTMLDivElement>(({ children, asChild, ...props }, forwardedRef) => {
  const Comp: any = asChild ? Slot : 'div';
  return (
    <Comp {...composableProps(props, { classNames: 'p-2 rounded-sm bg-base-surface text-base-fg' })} ref={forwardedRef}>
      {children}
    </Comp>
  );
});

/** Correct: built with `composable()`, so it carries the COMPOSABLE marker and spreads props. */
const GoodChild = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => (
  <div {...composableProps(props)} ref={forwardedRef}>
    {children}
  </div>
));

/** Incorrect: a plain `forwardRef`. It renders fine on its own, but as an `asChild` target the
 *  host's className never reaches the DOM — the failure this diagnostic exists to surface. */
const BadChild = forwardRef<HTMLDivElement, { children?: ReactNode }>(({ children }, forwardedRef) => (
  <div ref={forwardedRef}>{children}</div>
));

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='flex flex-col gap-1'>
    <span className='text-sm text-description'>{label}</span>
    {children}
  </div>
);

const DefaultStory = () => (
  <div className='flex flex-col gap-6 p-4 w-96'>
    <Row label='No asChild — host renders its own element.'>
      <Host>Plain host</Host>
    </Row>

    <Row label='asChild with a composable child — no warning.'>
      <Host asChild>
        <GoodChild>Composable child</GoodChild>
      </Host>
    </Row>

    <Row label='asChild with a non-composable child — dashed rose outline, and a console warning.'>
      <Host asChild>
        <BadChild>Non-composable child</BadChild>
      </Host>
    </Row>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/util/slots',
  render: DefaultStory,
  decorators: [withTheme(), withLayout()],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
