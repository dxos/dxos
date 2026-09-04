//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as ClaudeAgentSession from './ClaudeAgentSession';

describe('the variable a session credential binds', () => {
  test('an ordinary token name is accepted', ({ expect }) => {
    expect(accepts('GH_TOKEN')).toBe(true);
    expect(accepts('ANTHROPIC_API_KEY')).toBe(true);
  });

  // These configure the container rather than authorising a request: a credential binding is the
  // one place a caller sets an environment variable in a live session, and `0` in the TLS one
  // disables certificate verification outright.
  test.for(['PATH', 'NODE_OPTIONS', 'NODE_TLS_REJECT_UNAUTHORIZED', 'LD_PRELOAD', 'HTTPS_PROXY'])(
    '%s is rejected',
    (as, { expect }) => {
      expect(accepts(as)).toBe(false);
    },
  );

  test('the lower-case spelling of a reserved name is rejected too', ({ expect }) => {
    // Most clients honour `http_proxy` as readily as `HTTP_PROXY`, so case is not cosmetic.
    expect(accepts('http_proxy')).toBe(false);
    expect(accepts('node_options')).toBe(false);
  });

  test('a name that is not a variable at all is rejected', ({ expect }) => {
    expect(accepts('9LIVES')).toBe(false);
    expect(accepts('GH-TOKEN')).toBe(false);
    expect(accepts('')).toBe(false);
  });
});

// Only the variable name is under test, so the field is decoded on its own rather than through a
// whole credential with a live AccessToken ref behind it.
const accepts = (as: string) =>
  Schema.decodeUnknownOption(ClaudeAgentSession.SessionCredential.fields.as)(as)._tag === 'Some';
