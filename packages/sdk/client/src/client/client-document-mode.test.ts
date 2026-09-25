//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Config } from '@dxos/config';
import { Filter, Obj } from '@dxos/echo';
import { MirrorRepo, RepoProxy } from '@dxos/echo-client';
import { TestSchema } from '@dxos/echo/testing';
import { Runtime_Client_DocumentMode } from '@dxos/protocols/buf/dxos/config_pb';

import { Client } from './client.ts';

/** A client in HOST mode over its own services, with one space holding one written object. */
const openSpace = async (config: Config) => {
  const client = new Client({ config });
  onTestFinished(() => client.destroy());
  await client.initialize();
  await client.halo.createIdentity();
  await client.addTypes([TestSchema.Expando]);
  const space = await client.spaces.create();
  space.db.add(Obj.make(TestSchema.Expando, { name: 'written' }));
  await space.db.flush();
  const names = (await space.db.query(Filter.type(TestSchema.Expando)).run()).map((obj) => obj.name);
  return { space, names };
};

describe('Client document mode', () => {
  test('replicas by default', { timeout: 30_000 }, async ({ expect }) => {
    const { space, names } = await openSpace(new Config());
    expect(space.db._repo).toBeInstanceOf(RepoProxy);
    expect(names).toContain('written');
  });

  test(
    'runtime.client.documentMode gives the client proxies of its documents',
    { timeout: 30_000 },
    async ({ expect }) => {
      const { space, names } = await openSpace(
        new Config({ runtime: { client: { documentMode: Runtime_Client_DocumentMode.PROXY } } }),
      );
      expect(space.db._repo).toBeInstanceOf(MirrorRepo);
      expect(names).toContain('written');
    },
  );

  test(
    'DX_ECHO_DOCUMENT_MODE from the build applies when config sets no mode',
    { timeout: 30_000 },
    async ({ expect }) => {
      const { space } = await openSpace(new Config({ runtime: { app: { env: { DX_ECHO_DOCUMENT_MODE: 'proxy' } } } }));
      expect(space.db._repo).toBeInstanceOf(MirrorRepo);
    },
  );
});
