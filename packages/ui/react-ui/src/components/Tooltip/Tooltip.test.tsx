//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren, forwardRef } from 'react';
import { afterEach, describe, test } from 'vitest';

import { ThemeProvider } from '../../primitives';
import { defaultTx } from '../../theme';
import { Tooltip } from './Tooltip';

/**
 * A single provider serves every trigger in the app, so these pin the two consequences of that: the
 * open tooltip's DOM attributes belong to the active trigger alone, and pointing at one trigger must
 * not re-render the others.
 */
describe('Tooltip', () => {
  afterEach(() => {
    cleanup();
  });

  // `delayDuration={0}` opens on pointer-move without waiting, so no timer control is needed.
  const Harness = ({ onRender }: { onRender?: (label: string) => void }) => (
    <Tooltip.Provider delayDuration={0} disableHoverableContent>
      <CountingTrigger label='first' onRender={onRender} />
      <CountingTrigger label='second' onRender={onRender} />
    </Tooltip.Provider>
  );

  // `asChild` mirrors how `IconButton` uses the trigger, and is what makes this measurable: when
  // `Tooltip.Trigger` re-renders, `Slot` clones its child with freshly-composed handlers, so the wrapped
  // button re-renders with it. Counting the child therefore counts trigger re-renders — counting the
  // *parent* would not, since a context change re-renders the consumer, not whoever rendered it.
  const CountingTrigger = ({ label, onRender }: { label: string; onRender?: (label: string) => void }) => (
    <Tooltip.Trigger asChild content={`${label} tip`}>
      <CountingButton label={label} onRender={onRender} />
    </Tooltip.Trigger>
  );

  const CountingButton = forwardRef<HTMLButtonElement, { label: string; onRender?: (label: string) => void }>(
    ({ label, onRender, ...props }, forwardedRef) => {
      onRender?.(label);
      return (
        <button {...props} ref={forwardedRef}>
          {label}
        </button>
      );
    },
  );

  test('only the hovered trigger carries the open tooltip attributes', async ({ expect }) => {
    render(<Harness />, { wrapper: Wrapper });
    const [first, second] = screen.getAllByRole('button');

    expect(first.getAttribute('aria-describedby')).toBeNull();
    expect(second.getAttribute('aria-describedby')).toBeNull();

    fireEvent.pointerMove(first, { pointerType: 'mouse' });

    // The regression guard: these came from shared context, so opening one tooltip stamped every
    // trigger in the app as open and pointed them all at the one content id. Asserting "not closed"
    // rather than a specific state keeps this off the delayed-vs-instant open path.
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

  test('hovering one trigger does not re-render the others', ({ expect }) => {
    const renders: string[] = [];
    render(<Harness onRender={(label) => renders.push(label)} />, { wrapper: Wrapper });
    const [first] = screen.getAllByRole('button');

    // Guards the assertion below against passing because nothing is being counted at all.
    expect(renders).toContain('first');
    expect(renders).toContain('second');

    renders.length = 0;
    fireEvent.pointerMove(first, { pointerType: 'mouse' });

    // Every trigger used to re-render here (once for the trigger/content/side change, again for
    // `open`), dragging whatever each wraps via `asChild` along with it.
    expect(renders).toEqual([]);
  });
});

const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;
