//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Grant from './Grant.ts';
import * as Permission from './Permission.ts';
import * as Policy from './Policy.ts';
import * as Principal from './Principal.ts';
import * as Subject from './Subject.ts';

const alice = Principal.identity('did:halo:ALICE');
const agent = Principal.identity('did:halo:AGENT');
const space = Subject.space('BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA');

describe('Grant', () => {
  test('the id is content-addressed and independent of key order and meta', async ({ expect }) => {
    const permission = Permission.make({
      subject: space,
      command: '/space/read',
      policy: [Policy.eq('.caller.role', 'editor')],
    });
    const first = await EffectEx.runPromise(
      Grant.make({ issuer: alice, audience: agent, permissions: [permission], expiresAt: 1 }),
    );
    const second = await EffectEx.runPromise(
      Grant.make({ expiresAt: 1, permissions: [permission], audience: agent, issuer: alice, meta: { note: 'x' } }),
    );
    expect(first.id).toBe(second.id);
    expect(Grant.canonical(first)).toBe(
      '{"audience":"did:halo:AGENT","expiresAt":1,"issuer":"did:halo:ALICE","permissions":[{"command":"/space/read","policy":[["==",".caller.role","editor"]],"subject":"echo://BPBG3HN4O2XTMB5MRDZQXJBAXA7LAH4IA"}]}',
    );
    expect(await EffectEx.runPromise(Grant.verifyId(first))).toBe(true);
    expect(await EffectEx.runPromise(Grant.verifyId({ ...first, expiresAt: 2 }))).toBe(false);
  });

  test('round-trips through encode and decode', async ({ expect }) => {
    const grant = await EffectEx.runPromise(
      Grant.make({
        issuer: alice,
        audience: agent,
        permissions: [Permission.make({ subject: space, command: '/space' })],
        delegable: true,
      }),
    );
    expect(Grant.decode(JSON.parse(JSON.stringify(Grant.encode(grant))))).toEqual(grant);
  });

  test('rejects a malformed principal', ({ expect }) => {
    expect(() => Grant.decode({ id: 'x', issuer: 'alice', audience: agent, permissions: [] })).toThrow();
  });
});
