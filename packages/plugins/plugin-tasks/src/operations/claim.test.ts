//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { claimedAssignee } from './claim.ts';

describe('claimedAssignee', () => {
  const riley = { name: 'Riley', identityDid: 'did:key:riley' };
  const sam = { name: 'Sam', identityDid: 'did:key:sam' };
  const agent = { role: 'assistant' as const, name: 'agent' };

  test('the person the step answers to wins over one the claim names, and is written only on a step without one', () => {
    expect(claimedAssignee(riley, sam)?.name).toBe('Riley');
    expect(claimedAssignee(riley, undefined)?.name).toBe('Riley');
    expect(claimedAssignee(riley, sam, { owned: true })).toBeUndefined();
    expect(claimedAssignee(undefined, sam, { owned: true })).toBeUndefined();
    expect(claimedAssignee(undefined, sam)?.name).toBe('Sam');
    expect(claimedAssignee(riley, null, { owned: true })).toBeNull();
    expect(claimedAssignee(riley, agent)?.role).toBe('assistant');
  });
});
