//
// Copyright 2026 DXOS.org
//

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren, forwardRef } from 'react';
import { afterEach, describe, test } from 'vitest';

import { ThemeProvider } from '../../providers/index.ts';
import { defaultTx } from '../../theme/index.ts';
import { Tooltip, type TooltipSide, type TooltipTriggerProps } from './Tooltip.tsx';

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

  test('a vetoed hover stays closed without cancelling the pointer event', async ({ expect }) => {
    render(<Harness onInteract={() => false} />, { wrapper: Wrapper });
    const [first] = screen.getAllByRole('button');

    expect(fireEvent.pointerMove(first, { pointerType: 'mouse' })).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(first.getAttribute('data-state')).toEqual('closed');
    expect(first.getAttribute('aria-describedby')).toBeNull();
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

  test('the content is placed on the active trigger side', async ({ expect }) => {
    render(<Harness sides={['right', 'left']} />, { wrapper: Wrapper });
    const [first, second] = screen.getAllByRole('button');
    const placement = () =>
      document.querySelector('[data-scope="tooltip"][data-part="content"]')?.getAttribute('data-placement');

    // `fireEvent` flushes React updates inside `act` before the machine's queued event runs, which would hide a
    // placement rendered too late; native dispatch keeps the browser's ordering.
    const reactGlobal = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const actEnvironment = reactGlobal.IS_REACT_ACT_ENVIRONMENT;
    reactGlobal.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      const pointer = (element: HTMLElement, type: string) =>
        element.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }));

      pointer(first, 'pointermove');
      await waitFor(() => expect(placement()).toEqual('right'));

      pointer(first, 'pointerout');
      pointer(second, 'pointermove');
      await waitFor(() => expect(placement()).toEqual('left'));
    } finally {
      reactGlobal.IS_REACT_ACT_ENVIRONMENT = actEnvironment;
    }
  });

  test('the open tooltip follows a change to its trigger side', async ({ expect }) => {
    const { rerender } = render(<Harness sides={['right', 'left']} />, { wrapper: Wrapper });
    const [first] = screen.getAllByRole('button');
    const placement = () =>
      document.querySelector('[data-scope="tooltip"][data-part="content"]')?.getAttribute('data-placement');

    fireEvent.pointerMove(first, { pointerType: 'mouse' });
    await waitFor(() => expect(placement()).toEqual('right'));

    rerender(<Harness sides={['bottom', 'left']} />);
    await waitFor(() => expect(placement()).toEqual('bottom'));
  });

  test('clicking another trigger switches to its side', async ({ expect }) => {
    render(<Harness sides={['right', 'left']} />, { wrapper: Wrapper });
    const [first, second] = screen.getAllByRole('button');
    const placement = () =>
      document.querySelector('[data-scope="tooltip"][data-part="content"]')?.getAttribute('data-placement');

    fireEvent.pointerMove(first, { pointerType: 'mouse' });
    await waitFor(() => expect(placement()).toEqual('right'));

    // A keyboard-activated click reaches the trigger with no pointer move before it.
    fireEvent.click(second);
    await waitFor(() => expect(second.getAttribute('aria-describedby')).toBeTruthy());
    await waitFor(() => expect(placement()).toEqual('left'));
  });
});

type HarnessProps = {
  onRender?: (label: string) => void;
  describedBy?: string;
  onInteract?: TooltipTriggerProps['onInteract'];
};

// `delayDuration={0}` opens on pointer-move without waiting, so no timer control is needed.
const Harness = ({ onRender, describedBy, onInteract, sides = [] }: HarnessProps & { sides?: TooltipSide[] }) => (
  <Tooltip.Provider delayDuration={0} disableHoverableContent>
    <CountingTrigger
      label='first'
      onRender={onRender}
      describedBy={describedBy}
      onInteract={onInteract}
      side={sides[0]}
    />
    <CountingTrigger label='second' onRender={onRender} side={sides[1]} />
  </Tooltip.Provider>
);

// The counter belongs on the child, not here: a context change re-renders the consumer rather than
// whoever rendered it, and `Slot` clones the child on each trigger render, as `IconButton` does.
const CountingTrigger = ({
  label,
  onRender,
  describedBy,
  onInteract,
  side,
}: { label: string; side?: TooltipSide } & HarnessProps) => (
  <Tooltip.Trigger asChild content={`${label} tip`} side={side} onInteract={onInteract}>
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
