//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import { describe, expect, test } from 'vitest';

import type * as AppUpdate from '@dxos/app-toolkit/AppUpdate';

import { makeVersionCheckManager } from './version-check.ts';

const setup = (latest: () => Promise<string | undefined>, session = new Map<string, string>()) => {
  const statuses: AppUpdate.Status[] = [];
  const manager = makeVersionCheckManager({
    status: Atom.make<AppUpdate.Status>({ kind: 'idle' }),
    setStatus: (status) => statuses.push(status),
    dev: false,
    current: '/assets/main-old.js',
    fetchLatest: latest,
    reloadedFor: { get: () => session.get('build'), set: (build) => session.set('build', build) },
    reload: () => {},
  });
  return { manager, last: () => statuses.at(-1) };
};

const check = async (latest: () => Promise<string | undefined>) => {
  const { manager, last } = setup(latest);
  await manager.check();
  return last();
};

describe('makeVersionCheckManager', () => {
  test('a different build on the server is ready at once, with no download step', async () => {
    expect(await check(async () => '/assets/main-new.js')).toEqual({ kind: 'ready' });
  });

  test('the same build, or one that cannot be told, is up to date', async () => {
    expect(await check(async () => '/assets/main-old.js')).toMatchObject({ kind: 'up-to-date' });
    expect(await check(async () => undefined)).toMatchObject({ kind: 'up-to-date' });
  });

  test('a reload that comes back on the old build fails instead of reloading again', async () => {
    const session = new Map<string, string>();
    const before = setup(async () => '/assets/main-new.js', session);
    await before.manager.check();
    await before.manager.apply();

    const after = setup(async () => '/assets/main-new.js', session);
    await after.manager.check();
    expect(after.last()).toMatchObject({ kind: 'failed' });
  });

  test('a failed fetch is reported rather than read as up to date', async () => {
    expect(await check(() => Promise.reject(new Error('offline')))).toEqual({ kind: 'failed', error: 'offline' });
  });
});
