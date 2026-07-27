//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import {
  PasskeyDismissedError,
  PasskeyLoginError,
  PasskeyRejectedError,
  classifyPasskeyFailure,
  toPasskeyAssertionError,
} from './errors';

describe('passkey errors', () => {
  describe('toPasskeyAssertionError', () => {
    test('a dismissed prompt is not reported as a failure', () => {
      const error = toPasskeyAssertionError(new DOMException('The operation either timed out.', 'NotAllowedError'));
      expect(PasskeyDismissedError.is(error)).to.be.true;
    });

    test('an aborted ceremony is a dismissal', () => {
      const error = toPasskeyAssertionError(new DOMException('Aborted.', 'AbortError'));
      expect(PasskeyDismissedError.is(error)).to.be.true;
    });

    test('the native bridge rejects with a string, not a DOMException', () => {
      const error = toPasskeyAssertionError('ASAuthorizationError: the operation was canceled');
      expect(PasskeyDismissedError.is(error)).to.be.true;
    });

    test('anything else is a login failure', () => {
      const error = toPasskeyAssertionError(new DOMException('Bad state.', 'InvalidStateError'));
      expect(PasskeyLoginError.is(error)).to.be.true;
    });

    test('the original error is retained as the cause', () => {
      const cause = new DOMException('Bad state.', 'InvalidStateError');
      expect(toPasskeyAssertionError(cause).cause).to.eq(cause);
    });
  });

  describe('classifyPasskeyFailure', () => {
    test('each passkey error maps to its own message', () => {
      expect(classifyPasskeyFailure(new PasskeyDismissedError())).to.eq('dismissed');
      expect(classifyPasskeyFailure(new PasskeyRejectedError())).to.eq('rejected');
      expect(classifyPasskeyFailure(new PasskeyLoginError())).to.eq('failed');
    });

    test('an unrecognized error is surfaced rather than swallowed', () => {
      expect(classifyPasskeyFailure(new Error('boom'))).to.eq('failed');
      expect(classifyPasskeyFailure(undefined)).to.eq('failed');
    });
  });
});
