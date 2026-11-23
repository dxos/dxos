//
// Copyright 2026 DXOS.org
//

import { afterAll, bench, describe } from 'vitest';

import { Obj, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { blackhole } from './testing/bench-util.ts';

//
// The transitive deletion check. An entity counts as deleted when it or a strong dependency is — its
// parent, or a relation's endpoint — so every read of a child walks its ancestors, and query recompute
// asks it of every candidate. These rows price one walk over a parent chain and over a relation.
//
// The fixture is a three-level tree under one organization: 20 people, 5 children each, 5 grandchildren
// each, and one relation per grandchild back to the organization.
//

const BRANCHES = 20;
const FANOUT = 5;
const BATCH = 10;
const BENCH_OPTIONS = { time: 500 };

const builder = await new EchoTestBuilder().open();
const { db } = await builder.createDatabase({
  types: [TestSchema.Person, TestSchema.Organization, TestSchema.EmployedBy],
});

const organization = db.add(Obj.make(TestSchema.Organization, { name: 'root' }));
const addChild = (parent: Obj.Any, name: string): TestSchema.Person => {
  const child = db.add(Obj.make(TestSchema.Person, { name }));
  Obj.setParent(child, parent);
  return child;
};
const branches = Array.from({ length: BRANCHES }, (unusedValue, index) => addChild(organization, `p${index}`));
const middle = branches.flatMap((branch, index) =>
  Array.from({ length: FANOUT }, (unusedValue, child) => addChild(branch, `p${index}.${child}`)),
);
const leaves = middle.flatMap((parent, index) =>
  Array.from({ length: FANOUT }, (unusedValue, child) => addChild(parent, `p${index}.${child}`)),
);
const relations = leaves.map((leaf) =>
  db.add(Relation.make(TestSchema.EmployedBy, { [Relation.Source]: leaf, [Relation.Target]: organization, role: 'x' })),
);
await db.flush();

if (Obj.isDeleted(leaves[0]) || Obj.getParent(leaves[0]) !== middle[0]) {
  throw new Error('fixture: leaves must be live children of the middle level');
}

let cursor = 0;
let sink = 0;

afterAll(async () => {
  blackhole([sink, relations]);
  await builder.close();
}, 60_000);

describe('deletion', { tags: ['manual'], timeout: 120_000 }, () => {
  // Ten reads per call so tinybench's per-callback overhead does not swamp a short walk.
  bench(
    `Obj.isDeleted x${BATCH} (grandchild, 3 ancestors)`,
    () => {
      for (let step = 0; step < BATCH; step++) {
        sink += Obj.isDeleted(leaves[cursor++ % leaves.length]) ? 1 : 0;
      }
    },
    BENCH_OPTIONS,
  );

  bench(
    `Relation isDeleted x${BATCH} (grandchild → root endpoints)`,
    () => {
      for (let step = 0; step < BATCH; step++) {
        sink += Relation.isDeleted(relations[cursor++ % relations.length]) ? 1 : 0;
      }
    },
    BENCH_OPTIONS,
  );
});
