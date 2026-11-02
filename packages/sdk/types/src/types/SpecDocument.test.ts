//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Text } from '@dxos/schema';

import * as SpecDocument from './SpecDocument.ts';

describe('SpecDocument migrations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a document stored as org.dxos.type.spec keeps its id, name, content and meta under the new typename', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase({ types: [Text.Text] });
    graph.registry.add([SpecDocument.Legacy, SpecDocument.SpecDocument]);
    const legacy = db.add(
      Obj.make(SpecDocument.Legacy, {
        name: 'packages/a/PLUGIN.mdl',
        content: Ref.make(Text.make({ content: 'feat F-1: Sync' })),
      }),
    );
    Obj.update(legacy, (legacy) => {
      Obj.getMeta(legacy).keys.push({ source: 'github.com/dxos/dxos', id: 'packages/a/PLUGIN.mdl' });
    });
    await db.flush();
    await db.runMigrations(SpecDocument.migrations);

    const [document] = await db.query(Filter.type(SpecDocument.SpecDocument)).run();
    expect(document).toMatchObject({ id: legacy.id, name: 'packages/a/PLUGIN.mdl' });
    expect(Obj.getTypename(document)).toBe('org.dxos.type.specDocument');
    expect((await document.content.load()).content).toBe('feat F-1: Sync');
    expect(Obj.getMeta(document).keys).toEqual([{ source: 'github.com/dxos/dxos', id: 'packages/a/PLUGIN.mdl' }]);
  });
});
