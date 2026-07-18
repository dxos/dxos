//
// Copyright 2026 DXOS.org
//

// Runs in the Cloudflare Workers runtime (`workerd`) via `@cloudflare/vitest-pool-workers`,
// opted in with `workerd: true` in this package's vitest config. Guards that the core key
// primitives keep working against the runtime our production Cloudflare functions execute on
// (Buffer + web-crypto `getRandomValues` under `nodejs_compat`), not just under Node.

import { describe, expect, test } from 'vitest';

import { EntityId } from './entity-id';
import { PublicKey } from './public-key';

describe('keys in workerd', () => {
  test('runs inside the Cloudflare Workers runtime', () => {
    // workerd sets a fixed navigator.userAgent; asserts the pool actually swapped the runtime.
    expect(navigator.userAgent).toBe('Cloudflare-Workers');
  });

  test('PublicKey.random produces distinct hex-encoded keys', () => {
    const first = PublicKey.random();
    const second = PublicKey.random();
    expect(first.toHex()).toHaveLength(64);
    expect(PublicKey.equals(first, first)).toBe(true);
    expect(PublicKey.equals(first, second)).toBe(false);
  });

  test('PublicKey round-trips through hex', () => {
    const key = PublicKey.random();
    expect(PublicKey.from(key.toHex()).equals(key)).toBe(true);
  });

  test('EntityId.random yields valid ids', () => {
    const id = EntityId.random();
    expect(EntityId.isValid(id)).toBe(true);
  });

  test('EntityId.deterministic is stable and avoids the platform RNG', () => {
    // Workerd forbids `crypto.getRandomValues()` in global scope, so deterministic() must be
    // reachable at module-eval time — its stability doubles as that guard here.
    const first = EntityId.deterministic('org.dxos.type.person', '0.1.0');
    const second = EntityId.deterministic('org.dxos.type.person', '0.1.0');
    expect(first).toBe(second);
    expect(EntityId.isValid(first)).toBe(true);
  });
});
