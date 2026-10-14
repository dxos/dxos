//
// Copyright 2026 DXOS.org
//

import { type BeforeSendFn } from 'posthog-js';

/**
 * Browser-raised errors with no stack and no effect on the user: a ResizeObserver callback that resized an element
 * mid-delivery is reported this way, and the browser delivers the skipped notifications on the next frame.
 */
const BENIGN_EXCEPTIONS = [/^ResizeObserver loop/];

/** Drops `$exception` events whose every exception is benign. */
export const dropBenignExceptions: BeforeSendFn = (capture) => {
  if (capture?.event !== '$exception') {
    return capture;
  }

  const exceptions: { value?: unknown }[] = capture.properties.$exception_list ?? [];
  const benign =
    exceptions.length > 0 &&
    exceptions.every(
      ({ value }) => typeof value === 'string' && BENIGN_EXCEPTIONS.some((pattern) => pattern.test(value)),
    );
  return benign ? null : capture;
};
