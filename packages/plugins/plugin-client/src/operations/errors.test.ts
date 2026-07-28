//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { PasskeyDismissedError, classifyPasskeyFailure, toPasskeyAssertionError } from './errors';

describe('passkey errors', () => {
  // The native (Tauri) bridge rejects with a plain string rather than a DOMException, and
  // ASAuthorization spells it "canceled" while the web spells it "cancelled".
  test.each(['ASAuthorizationError: the operation was canceled', 'Prompt cancelled by user'])(
    'a native dismissal is recognised without a DOMException (%s)',
    (rejection) => {
      expect(PasskeyDismissedError.is(toPasskeyAssertionError(rejection))).to.be.true;
    },
  );

  // The bug this guards: a failure the classifier doesn't recognise must still reach the user.
  // A `switch` on the error tag without a default would regress to silence.
  test.each([new Error('Recovery key not registered.'), 'plain string', undefined, null])(
    'an unrecognised failure is still reported (%s)',
    (error) => {
      expect(classifyPasskeyFailure(error)).to.eq('failed');
    },
  );
});
