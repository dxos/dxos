//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { ModuleHostConnection } from './module-host-connection.ts';
import mathUrl from './modules/math.ts?module-url';
import textUrl from './modules/text.ts?module-url';

const BLOB_SOURCE = `export const module = { name: 'blob', methods: { double: (value) => value * 2 } };`;

const openHost = async (moduleUrls: string[]): Promise<ModuleHostConnection> => {
  const connection = new ModuleHostConnection({ moduleUrls });
  await connection.open();
  onTestFinished(async () => {
    await connection.close();
  });
  return connection;
};

describe('module host worker', () => {
  test('imports the init-config module URLs in the worker and serves them over RPC', async () => {
    const blobUrl = URL.createObjectURL(new Blob([BLOB_SOURCE], { type: 'text/javascript' }));
    onTestFinished(() => URL.revokeObjectURL(blobUrl));
    const missingUrl = new URL('/does-not-exist.js', location.href).href;
    const host = await openHost([mathUrl, textUrl, blobUrl, missingUrl]);

    const modules = await host.listModules();
    expect(modules.map(({ name }) => name)).toEqual(['math', 'text', 'blob', undefined]);
    expect(modules[0].methods).toEqual(['add', 'fibonacci', 'realm']);
    expect(modules[3].error).toBeDefined();

    expect(await host.invoke('math', 'add', 2, 3)).toBe(5);
    expect(await host.invoke('math', 'fibonacci', 6)).toEqual([0, 1, 1, 2, 3, 5]);
    expect(await host.invoke('text', 'wordCount', 'one two  three')).toBe(3);
    expect(await host.invoke('blob', 'double', 21)).toBe(42);
    expect(await host.invoke('math', 'realm')).toBe('worker');
  });

  test('rejects an unknown method with the typed error', async () => {
    const host = await openHost([mathUrl]);
    await expect(host.invoke('math', 'nope')).rejects.toThrow('unknown method: math.nope');
  });
});
