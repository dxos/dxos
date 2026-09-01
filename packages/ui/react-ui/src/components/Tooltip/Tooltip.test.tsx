//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren, forwardRef } from 'react';
import { afterEach, describe, test } from 'vitest';

import { ThemeProvider } from '../../primitives/index.ts';
import { defaultTx } from '../../theme/index.ts';
import { Tooltip } from './Tooltip.tsx';

/**
 * A single provider serves every trigger in the app, so these pin the two consequences of that: the
 * open tooltip's DOM attributes belong to the active trigger alone, and pointing at one trigger must
 * not re-render the others.
 */
describe('Tooltip', () => {
  afterEach(() => {
    cleanup();
  });

  test('only the hovered trigger carries the open tooltip attributes', async ({ expect }) => {
    render(<Harness />, { wrapper: Wrapper });
    const [first, second] = screen.getAllByRole('button');

    expect(first.getAttribute('aria-describedby')).toBeNull();
    expect(second.getAttribute('aria-describedby')).toBeNull();

    fireEvent.pointerMove(first, { pointerType: 'mouse' });

    // Asserting "not closed" rather than a specific state keeps this off the delayed-vs-instant path.
    await waitFor(() => expect(first.getAttribute('aria-describedby')).toBeTruthy());
    expect(first.getAttribute('data-state')).not.toEqual('closed');
    expect(second.getAttribute('data-state')).toEqual('closed');
    expect(second.getAttribute('aria-describedby')).toBeNull();
  });

  test('moving to another trigger hands the attributes over', async ({ expect }) => {
    render(<Harness />, { wrapper: Wrapper });
    const [first, second] = screen.getAllByRole('button');

    fireEvent.pointerMove(first, { pointerType: 'mouse' });
    await waitFor(() => expect(first.getAttribute('aria-describedby')).toBeTruthy());
    fireEvent.pointerLeave(first);
    fireEvent.pointerMove(second, { pointerType: 'mouse' });

    await waitFor(() => expect(second.getAttribute('aria-describedby')).toBeTruthy());
    expect(second.getAttribute('data-state')).not.toEqual('closed');
    expect(first.getAttribute('data-state')).toEqual('closed');
    expect(first.getAttribute('aria-describedby')).toBeNull();
  });

  test('keeps a description the trigger already carries', async ({ expect }) => {
    render(<Harness describedBy='own-description' />, { wrapper: Wrapper });
    const [first] = screen.getAllByRole('button');
    expect(first.getAttribute('aria-describedby')).toEqual('own-description');

    fireEvent.pointerMove(first, { pointerType: 'mouse' });
    await waitFor(() => expect(first.getAttribute('aria-describedby')).not.toEqual('own-description'));

    const described = first.getAttribute('aria-describedby')!.split(/\s+/);
    expect(described).toContain('own-description');
    expect(described.length).toEqual(2);

    // Closing restores what the trigger brought rather than clearing it.
    fireEvent.pointerLeave(first);
    fireEvent.pointerDown(first);
    await waitFor(() => expect(first.getAttribute('aria-describedby')).toEqual('own-description'));
  });

  test('hovering one trigger does not re-render the others', async ({ expect }) => {
    const renders: string[] = [];
    render(<Harness onRender={(label) => renders.push(label)} />, { wrapper: Wrapper });
    const [first] = screen.getAllByRole('button');

    // Guards the assertion below against passing because nothing is being counted at all.
    expect(renders).toContain('first');
    expect(renders).toContain('second');

    renders.length = 0;
    fireEvent.pointerMove(first, { pointerType: 'mouse' });

    // Waiting for the open state covers the second volatile update, not just the trigger change.
    await waitFor(() => expect(first.getAttribute('data-state')).not.toEqual('closed'));
    // A trigger re-render drags whatever it wraps via `asChild` with it, so this must stay at zero.
    expect(renders).toEqual([]);
  });
});

type HarnessProps = { onRender?: (label: string) => void; describedBy?: string };

// `delayDuration={0}` opens on pointer-move without waiting, so no timer control is needed.
const Harness = ({ onRender, describedBy }: HarnessProps) => (
  <Tooltip.Provider delayDuration={0} disableHoverableContent>
    <CountingTrigger label='first' onRender={onRender} describedBy={describedBy} />
    <CountingTrigger label='second' onRender={onRender} />
  </Tooltip.Provider>
);

// The counter belongs on the child, not here: a context change re-renders the consumer rather than
// whoever rendered it, and `Slot` clones the child on each trigger render, as `IconButton` does.
const CountingTrigger = ({ label, onRender, describedBy }: { label: string } & HarnessProps) => (
  <Tooltip.Trigger asChild content={`${label} tip`}>
    <CountingButton label={label} onRender={onRender} describedBy={describedBy} />
  </Tooltip.Trigger>
);

const CountingButton = forwardRef<HTMLButtonElement, { label: string } & HarnessProps>(
  ({ label, onRender, describedBy, ...props }, forwardedRef) => {
    onRender?.(label);
    return (
      <button {...props} {...(describedBy && { 'aria-describedby': describedBy })} ref={forwardedRef}>
        {label}
      </button>
    );
  },
);

const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;
