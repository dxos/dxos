//
// Copyright 2026 DXOS.org
//

import { describe, it } from '@effect/vitest';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import { expect } from 'vitest';

import { Database } from '@dxos/echo';
import { TestDatabaseLayer } from '@dxos/echo-client/testing';
import { AccessToken, Connection } from '@dxos/link';

import { CLAUDE_CODE_TOKEN_SOURCE } from '../constants.ts';
import { ClaudeCodeConnector } from './connector.ts';

const form = Effect.fromNullishOr(ClaudeCodeConnector.credentialForm).pipe(Effect.orDie);

/** The message the form shows for `token`, or undefined when it is accepted. */
const rejection = (token: string) =>
  Effect.gen(function* () {
    const { onValidate } = yield* form;
    if (!onValidate) {
      return yield* Effect.die(new Error('the connector validates its token'));
    }
    const exit = yield* onValidate({ values: { token }, connector: ClaudeCodeConnector }).pipe(Effect.exit);
    return Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined;
  });

describe('ClaudeCodeConnector', () => {
  it.effect('accepts a token from claude setup-token', () =>
    Effect.gen(function* () {
      expect(yield* rejection('  sk-ant-oat01-abc  ')).toBeUndefined();
    }),
  );

  it.effect('turns away an API key, pointing at the Anthropic connector', () =>
    Effect.gen(function* () {
      expect(yield* rejection('sk-ant-api03-abc')).toContain('Anthropic API key');
    }),
  );

  it.effect('turns away anything else, saying how to get a token', () =>
    Effect.gen(function* () {
      expect(yield* rejection('hello')).toContain('claude setup-token');
    }),
  );

  it.effect('stores the token apart from the API key', () =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const result = yield* (yield* form).onSubmit({
        values: { token: ' sk-ant-oat01-abc ' },
        connector: ClaudeCodeConnector,
        db,
      });
      expect(result.kind).toBe('complete');
      if (result.kind === 'complete') {
        expect(result.accessToken.source).toBe(CLAUDE_CODE_TOKEN_SOURCE);
        expect(result.accessToken.token).toBe('sk-ant-oat01-abc');
        expect(result.connection.connectorId).toBe(ClaudeCodeConnector.id);
      }
    }).pipe(Effect.provide(TestDatabaseLayer({ types: [AccessToken.AccessToken, Connection.Connection] }))),
  );
});
