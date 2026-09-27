//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test } from 'vitest';

import { ModuleHostConnection } from './module-host-connection.ts';
import geometryUrl from './modules/geometry.ts?module-url';
import mathUrl from './modules/math.ts?module-url';
import textUrl from './modules/text.ts?module-url';

const BLOB_SOURCE = `export const module = { name: 'blob', methods: { double: (value) => value * 2 } };`;

const toBlobUrl = (source: string): string => {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  onTestFinished(() => URL.revokeObjectURL(url));
  return url;
};

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
    const blobUrl = toBlobUrl(BLOB_SOURCE);
    const missingUrl = new URL('/does-not-exist.js', location.href).href;
    const host = await openHost([mathUrl, textUrl, geometryUrl, blobUrl, missingUrl]);

    const modules = await host.listModules();
    expect(modules.map(({ name }) => name)).toEqual(['math', 'text', 'geometry', 'blob', undefined]);
    expect(modules[0].methods).toEqual(['add', 'fibonacci', 'realm']);
    expect(modules[4].error).toBeDefined();

    expect(await host.invoke('math', 'add', 2, 3)).toBe(5);
    expect(await host.invoke('math', 'fibonacci', 6)).toEqual([0, 1, 1, 2, 3, 5]);
    expect(await host.invoke('text', 'wordCount', 'one two  three')).toBe(3);
    expect(await host.invoke('blob', 'double', 21)).toBe(42);
    expect(await host.invoke('math', 'realm')).toBe('worker');
  });

  test('compiles a TS module with relative and package imports', async () => {
    const host = await openHost([geometryUrl]);
    const points = [
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 },
    ];
    expect(await host.invoke('geometry', 'pathLength', points)).toEqual({ value: 11, unit: 'px' });
    expect(await host.invoke('geometry', 'realm')).toBe('worker');
  });

  test('rejects an unknown method with the typed error', async () => {
    const host = await openHost([mathUrl]);
    await expect(host.invoke('math', 'nope')).rejects.toThrow('unknown method: math.nope');
  });

  test('rejects duplicate names, non-function methods and inherited methods', async () => {
    const duplicateUrl = toBlobUrl(`export const module = { name: 'math', methods: { add: () => 0 } };`);
    const malformedUrl = toBlobUrl(`export const module = { name: 'bad', methods: { run: 1 } };`);
    const host = await openHost([mathUrl, duplicateUrl, malformedUrl]);

    const modules = await host.listModules();
    expect(modules[1].error).toBe('duplicate module name: math');
    expect(modules[2].error).toBe('missing or malformed `module` export');
    expect(await host.invoke('math', 'add', 1, 2)).toBe(3);
    await expect(host.invoke('math', 'toString')).rejects.toThrow('unknown method: math.toString');
  });
});
