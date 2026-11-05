//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as PluginProtocol from './PluginProtocol.ts';

const fullScope: PluginProtocol.InvocationScope = {
  accessTokenService: { getAccessToken: async () => ({ success: false, reason: 'test', [Symbol.dispose]: () => {} }) },
  conversation: 'echo://B2N35FBQKXIOTC5XEOCRVORIYQZHM2IBM/01KABCDEFGHJKMNPQRSTVWXYZ0',
  caller: { identityKey: 'key', identityDid: 'did:halo:caller' },
  pid: 'pid',
  cancellation: { waitForCancel: () => new Promise(() => {}) },
};

describe('PluginProtocol', () => {
  test('serves hosts from the first version up to its own', ({ expect }) => {
    expect(PluginProtocol.isSupported(PluginProtocol.UNVERSIONED)).toBe(true);
    expect(PluginProtocol.isSupported(PluginProtocol.PROTOCOL_VERSION)).toBe(true);
    expect(PluginProtocol.isSupported(PluginProtocol.PROTOCOL_VERSION + 1)).toBe(false);
    expect(PluginProtocol.isSupported(0)).toBe(false);
    expect(PluginProtocol.isSupported(1.5)).toBe(false);
  });

  test('sends a version 1 host only the access token service', ({ expect }) => {
    expect(PluginProtocol.scopeFor(1, fullScope)).toEqual({ accessTokenService: fullScope.accessTokenService });
    expect(PluginProtocol.scopeFor(PluginProtocol.PROTOCOL_VERSION, fullScope)).toEqual(fullScope);
  });
});
