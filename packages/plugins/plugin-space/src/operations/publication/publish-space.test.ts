//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN, Format, Obj, Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientOperation from '@dxos/plugin-client/ClientOperation';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SpacePlugin from '#meta';
import { SpaceOperation } from '#types';

import { TestObject } from '../testing.ts';

class TestToken extends Type.makeObject<TestToken>(DXN.make('com.example.type.testToken', '0.1.0'))(
  Schema.Struct({ token: Schema.String.pipe(Format.FormatAnnotation.set(Format.TypeFormat.Password)) }),
) {}

await Harness.preload({ plugins: [ClientPlugin.make({}), SpacePlugin.make({})] });

describe('SpaceOperation.PublishSpace', () => {
  test('publishes only what the space shows as live, and no credentials', async ({ expect }) => {
    const harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin.make({ publication: { viewerOrigin: 'https://view.test' } })],
    });
    await using _harness = harness;
    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await harness.invoke(ClientOperation.CreateIdentity, {});
    await client.addTypes([TestObject, TestToken]);

    const space = await client.spaces.create();
    await space.waitUntilReady();
    const kept = space.db.add(Obj.make(TestObject, { name: 'kept' }));
    const parent = space.db.add(Obj.make(TestObject, { name: 'parent' }));
    const child = space.db.add(Obj.make(TestObject, { name: 'child' }));
    Obj.setParent(child, parent);
    const token = space.db.add(Obj.make(TestToken, { token: 'secret-value' }));
    space.db.remove(parent);
    await space.db.flush({ indexes: true });

    const uploads: { manifest: { objects: string[] }; archive: string }[] = [];
    Object.defineProperty(client, 'edge', {
      value: {
        http: {
          request: async (_ctx: unknown, _path: string, { body }: { body: (typeof uploads)[number] }) => {
            uploads.push(body);
            return { publicId: 'pub-1', publishedAt: '2026-11-17T00:00:00.000Z' };
          },
        },
      },
    });

    await harness.invoke(SpaceOperation.PublishSpace, { space });

    const [{ manifest, archive }] = uploads;
    expect(manifest.objects).toContain(kept.id);
    for (const id of [parent.id, child.id, token.id]) {
      expect(manifest.objects).not.toContain(id);
      expect(archive).not.toContain(id);
    }
    expect(archive).not.toContain('secret-value');

    await harness.invoke(SpaceOperation.PublishSpace, { space });
    expect(uploads[1].archive).not.toContain(space.id);
  });
});
