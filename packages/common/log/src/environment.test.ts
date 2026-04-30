//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { inferEnvironmentName } from './environment';

const SUFFIX_PATTERN = /^[0-9a-z]{6}$/;

const splitId = (id: string): { scope: string; name: string; suffix: string } => {
  const firstColon = id.indexOf(':');
  const lastColon = id.lastIndexOf(':');
  return {
    scope: id.slice(0, firstColon),
    name: id.slice(firstColon + 1, lastColon),
    suffix: id.slice(lastColon + 1),
  };
};

class FakeStorage implements Storage {
  #map = new Map<string, string>();
  get length(): number {
    return this.#map.size;
  }
  clear(): void {
    this.#map.clear();
  }
  getItem(key: string): string | null {
    return this.#map.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.#map.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.#map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, value);
  }
}

class FakeSharedWorkerGlobalScope {}
class FakeDedicatedWorkerGlobalScope {}
class FakeServiceWorkerGlobalScope {}

const makeWorkerScope = (
  Ctor: new () => object,
  ctorName: string,
  name?: string,
): Record<string, unknown> => {
  const scope = Object.create(Ctor.prototype) as Record<string, unknown>;
  scope[ctorName] = Ctor;
  if (name !== undefined) {
    scope.name = name;
  }
  return scope;
};

const makeWindowScope = (origin: string, sessionStorage?: FakeStorage): Record<string, unknown> => {
  const scope: Record<string, unknown> = {
    location: { origin },
    sessionStorage,
  };
  scope.window = scope;
  return scope;
};

describe('inferEnvironmentName', () => {
  test('falls back to unknown:: when no recognized globals are present', ({ expect }) => {
    const id = inferEnvironmentName({ scope: {} });
    const { scope, name, suffix } = splitId(id);
    expect(scope).toBe('unknown');
    expect(name).toBe('');
    expect(suffix).toMatch(SUFFIX_PATTERN);
  });

  test('shared worker: emits shared-worker:<name>:<suffix>', ({ expect }) => {
    const scope = makeWorkerScope(FakeSharedWorkerGlobalScope, 'SharedWorkerGlobalScope', 'dxos-client-worker');
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('shared-worker');
    expect(parts.name).toBe('dxos-client-worker');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('dedicated worker: emits dedicated-worker:<name>:<suffix>', ({ expect }) => {
    const scope = makeWorkerScope(FakeDedicatedWorkerGlobalScope, 'DedicatedWorkerGlobalScope', 'dxos-client-worker');
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('dedicated-worker');
    expect(parts.name).toBe('dxos-client-worker');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('service worker: emits service-worker::<suffix> (no name on global)', ({ expect }) => {
    const scope = makeWorkerScope(FakeServiceWorkerGlobalScope, 'ServiceWorkerGlobalScope');
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('service-worker');
    expect(parts.name).toBe('');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('anonymous worker: empty name segment', ({ expect }) => {
    const scope = makeWorkerScope(FakeDedicatedWorkerGlobalScope, 'DedicatedWorkerGlobalScope');
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('dedicated-worker');
    expect(parts.name).toBe('');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('window: emits tab:<origin>:<suffix>', ({ expect }) => {
    const scope = makeWindowScope('https://composer.dxos.org', new FakeStorage());
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('tab');
    expect(parts.name).toBe('https://composer.dxos.org');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('window: origin containing colons is preserved (split on first/last colon)', ({ expect }) => {
    const scope = makeWindowScope('http://localhost:5173', new FakeStorage());
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('tab');
    expect(parts.name).toBe('http://localhost:5173');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('window: suffix is stable across calls (sessionStorage backed)', ({ expect }) => {
    const session = new FakeStorage();
    const scope = makeWindowScope('http://localhost:5173', session);
    const first = inferEnvironmentName({ scope });
    const second = inferEnvironmentName({ scope });
    expect(splitId(first).suffix).toBe(splitId(second).suffix);
  });

  test('window: different sessionStorage instances yield different suffixes (different tabs)', ({ expect }) => {
    const scopeA = makeWindowScope('http://localhost:5173', new FakeStorage());
    const scopeB = makeWindowScope('http://localhost:5173', new FakeStorage());
    const idA = inferEnvironmentName({ scope: scopeA });
    const idB = inferEnvironmentName({ scope: scopeB });
    // Stronger than the typical "all suffixes differ" check since the chance of collision
    // for a 6-char base-36 suffix is ~5e-10 per pair.
    expect(splitId(idA).suffix).not.toBe(splitId(idB).suffix);
  });

  test('window: missing sessionStorage falls back to fresh random per call', ({ expect }) => {
    const scope = makeWindowScope('https://example.com', undefined);
    const first = inferEnvironmentName({ scope });
    const second = inferEnvironmentName({ scope });
    expect(splitId(first).suffix).toMatch(SUFFIX_PATTERN);
    expect(splitId(second).suffix).toMatch(SUFFIX_PATTERN);
    // Without storage we can't pin them; assert behavior, not equality.
  });

  test('worker suffixes vary across calls (no persistence)', ({ expect }) => {
    const scope = makeWorkerScope(FakeDedicatedWorkerGlobalScope, 'DedicatedWorkerGlobalScope', 'w');
    const ids = new Set<string>();
    for (let index = 0; index < 16; index++) {
      ids.add(splitId(inferEnvironmentName({ scope })).suffix);
    }
    expect(ids.size).toBeGreaterThan(1);
  });

  test('node: emits node:<pid>:<suffix>', ({ expect }) => {
    const scope = { process: { pid: 12345, versions: { node: '24.1.0' } } };
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('node');
    expect(parts.name).toBe('12345');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('node: missing pid yields empty name segment', ({ expect }) => {
    const scope = { process: { versions: { node: '24.1.0' } } };
    const parts = splitId(inferEnvironmentName({ scope }));
    expect(parts.scope).toBe('node');
    expect(parts.name).toBe('');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('node: process without versions.node is not detected as node', ({ expect }) => {
    // e.g. a userland `process`-like object — should fall through to unknown.
    const scope = { process: { pid: 1, versions: {} } };
    const parts = splitId(inferEnvironmentName({ scope }));
    expect(parts.scope).toBe('unknown');
  });

  test('cloudflare worker: emits cf-worker::<suffix>', ({ expect }) => {
    const scope = { navigator: { userAgent: 'Cloudflare-Workers' } };
    const id = inferEnvironmentName({ scope });
    const parts = splitId(id);
    expect(parts.scope).toBe('cf-worker');
    expect(parts.name).toBe('');
    expect(parts.suffix).toMatch(SUFFIX_PATTERN);
  });

  test('cloudflare worker: detected even when service-worker scope is also present', ({ expect }) => {
    // CF workers in service-worker syntax expose ServiceWorkerGlobalScope; CF should win.
    const scope = makeWorkerScope(FakeServiceWorkerGlobalScope, 'ServiceWorkerGlobalScope') as any;
    scope.navigator = { userAgent: 'Cloudflare-Workers' };
    const parts = splitId(inferEnvironmentName({ scope }));
    expect(parts.scope).toBe('cf-worker');
  });

  test('cloudflare worker: detected even when process is also exposed (nodejs_compat)', ({ expect }) => {
    // CF workers with the nodejs_compat flag expose a partial `process` polyfill;
    // CF detection must still win over the node fallback.
    const scope: Record<string, unknown> = {
      navigator: { userAgent: 'Cloudflare-Workers' },
      process: { pid: 1, versions: { node: '20.0.0' } },
    };
    const parts = splitId(inferEnvironmentName({ scope }));
    expect(parts.scope).toBe('cf-worker');
  });

  test('safe to invoke with no arguments in the host runtime (does not throw)', ({ expect }) => {
    expect(() => inferEnvironmentName()).not.toThrow();
    const id = inferEnvironmentName();
    // Format must always be 3 colon-separated segments with a valid suffix.
    expect(splitId(id).suffix).toMatch(SUFFIX_PATTERN);
  });
});
