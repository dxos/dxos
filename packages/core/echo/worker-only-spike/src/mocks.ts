//
// Copyright 2026 DXOS.org
//

// Shared vi.mock factories: Automerge's namespaces answer for tab documents, anything else falls through,
// and any other function that receives a tab document is recorded as a leak.

const install = async (actual: object) => {
  const { spikeOverrides, watchLeaks } = await import('./namespace.ts');
  const overrides = spikeOverrides((name, ...args) => {
    const fn: unknown = Reflect.get(actual, name);
    if (typeof fn !== 'function') {
      throw new TypeError(`Automerge has no function ${name}`);
    }
    return Reflect.apply(fn, actual, args);
  });
  return { ...watchLeaks(Object.fromEntries(Object.entries(actual)), overrides), ...overrides };
};

export const automergeFactory = async (importOriginal: () => Promise<object>) => {
  const actual = await importOriginal();
  const cls: unknown = Reflect.get(actual, 'ImmutableString');
  if (typeof cls === 'function') {
    const { useImmutableString } = await import('./immutable-string.ts');
    useImmutableString((value) => Reflect.construct(cls, [value]));
  }
  const next: unknown = Reflect.get(actual, 'next');
  return { ...(await install(actual)), next: await install(typeof next === 'object' && next !== null ? next : actual) };
};

export const proxyNamespaceFactory = async (importOriginal: () => Promise<object>) => install(await importOriginal());
