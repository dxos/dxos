//
// Copyright 2026 DXOS.org
//

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { ThemeProvider } from '../../primitives';
import { defaultTx } from '../../theme';
import { Tooltip } from './Tooltip';

const PROVIDER_DELAY = 700;
const TRIGGER_DELAY = 200;

const Wrapper = ({ children }: PropsWithChildren) => <ThemeProvider tx={defaultTx}>{children}</ThemeProvider>;

const hover = async (element: HTMLElement) => {
  // Radix opens on `pointermove` (a touch pointer is ignored), not `mouseenter`.
  fireEvent.pointerMove(element, { pointerType: 'mouse' });
};

// Drives the open timer without waiting in real time; `act` flushes the state update it schedules.
const elapse = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

describe('Tooltip delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  test("a trigger's own delayDuration overrides the provider's", async ({ expect }) => {
    render(
      <Tooltip.Provider delayDuration={PROVIDER_DELAY}>
        <Tooltip.Trigger type='button' content='Field documentation' delayDuration={TRIGGER_DELAY}>
          info
        </Tooltip.Trigger>
      </Tooltip.Provider>,
      { wrapper: Wrapper },
    );

    await hover(screen.getByRole('button'));

    // Still closed just short of the trigger's delay — the affordance ignores a cursor passing over it.
    await elapse(TRIGGER_DELAY - 50);
    expect(screen.queryByRole('tooltip')).toBeNull();

    // Open well before the provider's delay would have elapsed.
    await elapse(100);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });

  test("a trigger without one waits out the provider's delay", async ({ expect }) => {
    render(
      <Tooltip.Provider delayDuration={PROVIDER_DELAY}>
        <Tooltip.Trigger type='button' content='Field documentation'>
          info
        </Tooltip.Trigger>
      </Tooltip.Provider>,
      { wrapper: Wrapper },
    );

    await hover(screen.getByRole('button'));

    await elapse(TRIGGER_DELAY + 50);
    expect(screen.queryByRole('tooltip')).toBeNull();

    await elapse(PROVIDER_DELAY);
    expect(screen.getByRole('tooltip')).toBeTruthy();
  });
});
