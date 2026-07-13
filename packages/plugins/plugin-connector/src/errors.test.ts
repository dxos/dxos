//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { LayoutOperation } from '@dxos/app-toolkit';
import { BaseError } from '@dxos/errors';

import { ConnectionAuthExpiredError, isUnauthorizedError } from './errors';

describe('isUnauthorizedError', () => {
  test('detects a GoogleApiError-style numeric `code`', ({ expect }) => {
    expect(isUnauthorizedError({ code: 401, apiMessage: 'Invalid credentials' })).toBe(true);
  });

  test('detects a JmapApiError-style numeric `status`', ({ expect }) => {
    expect(isUnauthorizedError({ status: 401, detail: 'Unauthorized' })).toBe(true);
  });

  test('detects a BaseError whose `code`/`status` only lives in `context`', ({ expect }) => {
    class GoogleApiErrorLike extends BaseError.extend('GoogleApiErrorLike', 'Google API request failed.') {
      constructor(code: number) {
        super({ context: { code } });
      }
    }
    expect(isUnauthorizedError(new GoogleApiErrorLike(401))).toBe(true);
  });

  test('detects an @effect/platform ResponseError shape', ({ expect }) => {
    expect(isUnauthorizedError({ _tag: 'ResponseError', response: { status: 401 } })).toBe(true);
  });

  test('does not flag other HTTP statuses', ({ expect }) => {
    expect(isUnauthorizedError({ code: 500 })).toBe(false);
    expect(isUnauthorizedError({ status: 403 })).toBe(false);
    expect(isUnauthorizedError({ _tag: 'ResponseError', response: { status: 429 } })).toBe(false);
  });

  test('does not flag errors with no code/status at all (e.g. Slack-style body errors)', ({ expect }) => {
    class SlackApiErrorLike extends BaseError.extend('SlackApiErrorLike', 'Slack API returned an error.') {
      constructor(code: string) {
        super({ context: { code } });
      }
    }
    expect(isUnauthorizedError(new SlackApiErrorLike('invalid_auth'))).toBe(false);
  });

  test('does not throw on non-record inputs', ({ expect }) => {
    expect(isUnauthorizedError(null)).toBe(false);
    expect(isUnauthorizedError(undefined)).toBe(false);
    expect(isUnauthorizedError('boom')).toBe(false);
  });
});

describe('ConnectionAuthExpiredError', () => {
  const action = {
    operation: 'org.dxos.plugin.deck.operation.open',
    input: { subject: ['space-1/settings/connections/connection-1'], navigation: 'immediate' },
  };

  test('carries a serializable notifyOverride the notify layer can read back', ({ expect }) => {
    const error = new ConnectionAuthExpiredError({ connectionId: 'connection-1', action });

    // The notify layer reads the override off the process's raw failure value (unwrapped from the
    // cause by the runtime), so pass the error directly.
    const override = LayoutOperation.getNotifyOverride(error);
    expect(override?.title).toBe('Connection expired');
    expect(override?.actionLabel).toBe('Go to connection');
    expect(override?.action).toEqual(action);
  });

  test('preserves the original error as `cause`', ({ expect }) => {
    const originalError = new Error('401 from provider');
    const error = new ConnectionAuthExpiredError({ connectionId: 'connection-1', action, cause: originalError });
    expect(error.cause).toBe(originalError);
  });
});
