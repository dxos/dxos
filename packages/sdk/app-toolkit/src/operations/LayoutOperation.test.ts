//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { BaseError } from '@dxos/errors';

import * as LayoutOperation from './LayoutOperation';

describe('notify override', () => {
  test('round-trips through a thrown error', ({ expect }) => {
    class ExampleError extends BaseError.extend('ExampleError', 'Example failed.') {
      constructor() {
        super({ context: LayoutOperation.setNotifyOverride({ title: 'Nicer title', actionLabel: 'Retry' }) });
      }
    }

    // `getNotifyOverride` takes the raw failure value (`Process.Info.error.value`), which the process
    // runtime unwraps from the fail/die channel before the notify layer ever sees it.
    const override = LayoutOperation.getNotifyOverride(new ExampleError());
    expect(override?.title).toBe('Nicer title');
    expect(override?.actionLabel).toBe('Retry');
  });

  test('carries a serialized action invocation', ({ expect }) => {
    const action = { operation: 'org.dxos.plugin.deck.operation.open', input: { subject: ['a/b/c'] } };
    class ExampleError extends BaseError.extend('ExampleError', 'Example failed.') {
      constructor() {
        super({ context: LayoutOperation.setNotifyOverride({ title: 'x', actionLabel: 'Go', action }) });
      }
    }

    expect(LayoutOperation.getNotifyOverride(new ExampleError())?.action).toEqual(action);
  });

  test('returns null when the error carries no override', ({ expect }) => {
    expect(LayoutOperation.getNotifyOverride(new Error('plain failure'))).toBeNull();
  });

  test('returns null for non-record / missing failures', ({ expect }) => {
    expect(LayoutOperation.getNotifyOverride(null)).toBeNull();
    expect(LayoutOperation.getNotifyOverride(undefined)).toBeNull();
    expect(LayoutOperation.getNotifyOverride('boom')).toBeNull();
  });

  test('returns null when notifyOverride is not a record', ({ expect }) => {
    class BogusError extends BaseError.extend('BogusError', 'Bogus.') {
      constructor() {
        super({ context: { notifyOverride: 'not-a-record' } });
      }
    }

    expect(LayoutOperation.getNotifyOverride(new BogusError())).toBeNull();
  });
});
