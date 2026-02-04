//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import type * as Entity from './Entity';
import * as Obj from './Obj';
import * as Relation from './Relation';
import { TestSchema } from './testing';

describe('Entity', () => {
  test('Entity.Unknown accepts any object or relation', () => {
    const obj = Obj.make(TestSchema.Person, { name: 'Test' });
    const rel = Relation.make(TestSchema.HasManager, { [Relation.Source]: obj, [Relation.Target]: obj });
    const doSomething = (entity: Entity.Unknown) => {
      return entity;
    };
    expect(doSomething(obj)).toBe(obj);
    expect(doSomething(rel)).toBe(rel);
  });
});
