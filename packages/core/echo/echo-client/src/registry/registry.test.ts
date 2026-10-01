//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Lens, Type } from '@dxos/echo';
import { DXN } from '@dxos/keys';

import { makeRegistry } from './registry.ts';

const TaskV1 = Type.makeObject(DXN.make('org.dxos.test.registryTask', '0.1.0'))(
  Schema.Struct({ title: Schema.String }),
);
const TaskV2 = Type.makeObject(DXN.make('org.dxos.test.registryTask', '0.2.0'))(Schema.Struct({ name: Schema.String }));

describe('registry lenses', () => {
  test('a lens is found by its source and by its endpoints, and is kept out of entity lists', () => {
    const registry = makeRegistry({ initial: [TaskV1, TaskV2] });
    const lens = Lens.make(TaskV1, TaskV2, { name: 'title' });
    registry.add([lens]);

    expect(registry.lensBetween(Type.getURI(TaskV1), Type.getURI(TaskV2))).toBe(lens);
    expect(registry.lensesFrom(Type.getURI(TaskV1))).toEqual([lens]);
    expect(registry.lensesFrom(Type.getURI(TaskV2))).toEqual([]);
    expect(registry.list()).not.toContain(lens);
    expect(registry.remove(lens.id)).toBe(true);
    expect(registry.lenses()).toEqual([]);
  });

  test('a pair has at most one lens: the same lens again replaces it, a different one throws', () => {
    const registry = makeRegistry();
    registry.add([Lens.make(TaskV1, TaskV2, { name: 'title' })]);
    const again = Lens.make(TaskV1, TaskV2, { name: 'title' });
    registry.add([again]);
    expect(registry.lenses()).toEqual([again]);

    const Other = Type.makeObject(DXN.make('org.dxos.test.registryTask', '0.2.0'))(
      Schema.Struct({ name: Schema.String, title: Schema.optional(Schema.String) }),
    );
    expect(() => registry.add([Lens.make(TaskV1, Other, { name: 'title' })])).toThrow(
      /a different lens is already registered/,
    );
  });

  test('a local lens shadows an upstream one of the same name', () => {
    const upstream = makeRegistry();
    const remote = Lens.make(TaskV1, TaskV2, { name: 'title' });
    upstream.add([remote]);
    const registry = makeRegistry({ upstream });
    expect(registry.lensBetween(Type.getURI(TaskV1), Type.getURI(TaskV2))).toBe(remote);

    const local = Lens.make(TaskV1, TaskV2, { name: 'title' });
    registry.add([local]);
    expect(registry.lenses()).toEqual([local]);
  });
});
