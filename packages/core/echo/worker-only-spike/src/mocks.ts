//
// Copyright 2026 DXOS.org
//

// Shared vi.mock factories: Automerge's namespaces answer for tab documents, anything else falls through.

export const automergeFactory = async (importOriginal: () => Promise<unknown>) => {
  const actual: any = await importOriginal();
  const { spikeOverrides } = await import('./namespace.ts');
  return {
    ...actual,
    ...spikeOverrides(actual),
    next: { ...(actual.next ?? actual), ...spikeOverrides(actual.next ?? actual) },
  };
};

export const proxyNamespaceFactory = async (importOriginal: () => Promise<unknown>) => {
  const actual: any = await importOriginal();
  const { spikeOverrides } = await import('./namespace.ts');
  return { ...actual, ...spikeOverrides(actual) };
};
