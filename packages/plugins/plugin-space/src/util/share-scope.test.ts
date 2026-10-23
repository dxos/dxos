//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Collection, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EntityId, SpaceId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import { collectShareScope, findReferencedObjectIds } from './share-scope.ts';

describe('findReferencedObjectIds', () => {
  const spaceId = SpaceId.random();
  const [first, second, third, fourth] = Array.from({ length: 4 }, () => EntityId.random());

  test('finds references and ECHO links inside strings, in the same space only', ({ expect }) => {
    const json = {
      content: { '/': `echo://${spaceId}/${first}` },
      text: `See [Second](echo:///${second}) and [Third](dxn:echo:@:${third}).`,
      foreign: { '/': `echo://${SpaceId.random()}/${fourth}` },
    };
    expect(findReferencedObjectIds(json, spaceId).sort()).toEqual([first, second, third].sort());
  });

  test('skips system properties, so a walk does not climb to what holds the object', ({ expect }) => {
    const json = { '@parent': { '/': `echo:///${first}` }, '@uri': `echo://${spaceId}/${second}`, 'items': [] };
    expect(findReferencedObjectIds(json, spaceId)).toEqual([]);
  });
});

describe('collectShareScope', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('follows references and markdown links, and nothing else', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, Text.Text] });
    const linked = db.add(Text.make({ content: 'The linked document.' }));
    db.add(Text.make({ content: 'An unrelated document.' }));
    const body = db.add(Text.make({ content: `Read [the other one](echo:///${linked.id}).` }));
    const shared = db.add(Collection.make({ objects: [Ref.make(body)] }));
    await db.flush({ indexes: true });

    const scope = await EffectEx.runPromise(collectShareScope(shared));
    expect(scope.map((object) => object.id)).toEqual([shared.id, body.id, linked.id]);
  });

  test('stops at the object cap', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Collection.Collection, Text.Text] });
    const items = Array.from({ length: 5 }, (_, index) => db.add(Text.make({ content: `Item ${index}` })));
    const shared = db.add(Collection.make({ objects: items.map((item) => Ref.make(item)) }));
    await db.flush({ indexes: true });

    const scope = await EffectEx.runPromise(collectShareScope(shared, { maxObjects: 3 }));
    expect(scope).toHaveLength(3);
    expect(scope[0]).toBe(shared);
    expect(Obj.isObject(scope[2])).toBe(true);
  });
});
