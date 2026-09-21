//
// Copyright 2025 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type LogEntry, LogLevel, type LogProcessor, log } from '@dxos/log';

import * as PasskeyError from './PasskeyError.ts';

describe('passkey errors', () => {
  // The native (Tauri) bridge rejects with a plain string rather than a DOMException, and
  // ASAuthorization spells it "canceled" while the web spells it "cancelled".
  test.each(['ASAuthorizationError: the operation was canceled', 'Prompt cancelled by user'])(
    'a native dismissal is recognised without a DOMException (%s)',
    (rejection) => {
      expect(PasskeyError.Dismissed.is(PasskeyError.fromAssertion(rejection))).to.be.true;
    },
  );

  // The bug this guards: a failure the classifier doesn't recognise must still reach the user.
  // A `switch` on the error tag without a default would regress to silence.
  test.each([new Error('Recovery key not registered.'), 'plain string', undefined, null])(
    'an unrecognised failure is still reported (%s)',
    (error) => {
      expect(PasskeyError.classify(error)).to.eq('failed');
    },
  );

  // DX-1281: the welcome screen reported a dismissal at error level, which swamped the
  // production error stream.
  test.each([
    new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'),
    new DOMException('signal aborted', 'AbortError'),
    new PasskeyError.Dismissed(),
  ])('a dismissal is reported below error level (%s)', (error) => {
    const entries = captureLogEntries(() => {
      expect(PasskeyError.report(error)).to.eq('dismissed');
    });
    expect(entries).to.have.length(1);
    expect(entries[0].level).to.eq(LogLevel.INFO);
  });

  test.each([new DOMException('no authenticator', 'NotSupportedError'), new Error('EDGE unreachable')])(
    'a genuine failure is still reported at error level (%s)',
    (error) => {
      const entries = captureLogEntries(() => {
        expect(PasskeyError.report(error)).to.eq('failed');
      });
      expect(entries).to.have.length(1);
      expect(entries[0].level).to.eq(LogLevel.ERROR);
    },
  );
});

/** Collect the log entries `body` emits, so a test can assert on the level a code path reports at. */
const captureLogEntries = (body: () => void): LogEntry[] => {
  const entries: LogEntry[] = [];
  const processor: LogProcessor = (_config, entry) => {
    entries.push(entry);
  };
  const remove = log.addProcessor(processor);
  try {
    body();
  } finally {
    remove();
  }

  return entries;
};
