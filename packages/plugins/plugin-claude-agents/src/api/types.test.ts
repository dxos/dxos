//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { AgentResponse, CredentialPage, EventPage, SessionResponse, VaultResponse } from './types';

describe('response schemas', () => {
  const decodeAgent = Schema.decodeUnknownOption(AgentResponse);
  const decodeSession = Schema.decodeUnknownOption(SessionResponse);
  const decodeEvents = Schema.decodeUnknownOption(EventPage);

  test('an agent response without an id is rejected', ({ expect }) => {
    // The id is persisted and later requests are addressed by it, so accepting the body would mark
    // the agent deployed with nothing to deploy against.
    expect(decodeAgent({ version: 1 })._tag).toBe('None');
    expect(decodeAgent({ id: 'agent_1', version: 2 })._tag).toBe('Some');
  });

  test('a session response without an id is rejected', ({ expect }) => {
    expect(decodeSession({ status: 'running' })._tag).toBe('None');
    expect(decodeSession({ id: 'sess_1' })._tag).toBe('Some');
  });

  test('unknown fields are ignored and nullable ones accepted', ({ expect }) => {
    const decoded = decodeSession({ id: 'sess_1', status: 'idle', stop_reason: null, unexpected: 'ignored' });
    expect(decoded._tag).toBe('Some');
    expect(decodeSession({ id: 'sess_1', stop_reason: { type: 'end_turn' } })._tag).toBe('Some');
  });

  test('a vault response without an id is rejected', ({ expect }) => {
    // The id is recorded on the session and every later credential edit is addressed by it.
    const decodeVault = Schema.decodeUnknownOption(VaultResponse);
    expect(decodeVault({ display_name: 'composer-session' })._tag).toBe('None');
    expect(decodeVault({ id: 'vlt_1', display_name: 'composer-session' })._tag).toBe('Some');
  });

  test('credential pages decode without secret values', ({ expect }) => {
    // Secret values are write-only, so an upsert matches on the env var name the page carries.
    const decodeCredentials = Schema.decodeUnknownOption(CredentialPage);
    expect(decodeCredentials({})._tag).toBe('Some');
    const decoded = decodeCredentials({
      data: [{ id: 'cred_1', auth: { type: 'environment_variable', secret_name: 'GH_TOKEN' } }],
    });
    expect(decoded._tag).toBe('Some');
    expect(decodeCredentials({ data: [{ auth: { secret_name: 'GH_TOKEN' } }] })._tag).toBe('None');
    expect(decodeCredentials({ data: [], next_page: 'cursor' })._tag).toBe('Some');
    expect(decodeCredentials({ data: [], next_page: null })._tag).toBe('Some');
  });

  test('an empty event page decodes', ({ expect }) => {
    expect(decodeEvents({})._tag).toBe('Some');
    expect(decodeEvents({ data: [{ type: 'agent.message', content: [{ type: 'text', text: 'hi' }] }] })._tag).toBe(
      'Some',
    );
  });
});
