//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';

import { EchoTestBuilder, getObjectCore } from '../testing/index.ts';

//
// Lens-backed migrations, Phase C1/C4 (`.agents/projects/lenses/IMPLEMENTATION-PLAN.md`):
// `ObjectCore.foldAt` writes a late (fold-forward) value concurrent with everything after a recorded
// heads, so it lands as a real Automerge conflict instead of clobbering a later direct edit; readers
// resolve the user-wins policy from `Obj.getConflict`, never from the raw Automerge tie-break.
//

const Person = Type.makeObject(DXN.make('org.dxos.test.fold-at.Person', '0.1.0'))(
  Schema.Struct({
    fullName: Schema.optional(Schema.String),
    name: Schema.optional(Schema.String),
  }),
);

describe('ObjectCore.foldAt', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a late fold at the recorded heads conflicts with a later direct edit; the direct edit is presented, the fold is a browsable alternative', async () => {
    const { db } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();

    // The migration-like rename: copy `fullName` into the new `name` property. The heads right after
    // this is where a fold-forward runner would record it and later fold a late `fullName` write.
    Obj.update(person, (person) => {
      person.name = person.fullName;
    });
    await db.flush();
    const postMigrationHeads = A.getHeads(getObjectCore(person).getDoc());

    // A direct user edit, made after the migration heads -- exactly what the fold must not clobber.
    Obj.update(person, (person) => {
      person.name = 'direct';
    });
    await db.flush();

    // The fold-forward runner discovers a late `fullName` write and folds it at the recorded heads.
    const foldMessage = 'fold: fullName -> name';
    const newHeads = getObjectCore(person).foldAt(
      postMigrationHeads,
      (data) => {
        data.name = 'late';
      },
      { message: foldMessage },
    );
    expect(newHeads).toBeDefined();

    const conflict = Obj.getConflict(person, 'name');
    invariant(conflict, 'expected a real Automerge conflict on `name`');
    // User-wins: the direct edit is presented regardless of which side the raw Automerge tie-break favors.
    expect(conflict.presented).to.eq('direct');
    expect(conflict.alternatives).to.have.length(2);

    const direct = conflict.alternatives.find((alternative) => !alternative.fold);
    const fold = conflict.alternatives.find((alternative) => alternative.fold);
    invariant(direct, 'expected the direct edit among the alternatives');
    invariant(fold, 'expected the fold among the alternatives');
    expect(direct.value).to.eq('direct');
    expect(fold.value).to.eq('late');
    expect(fold.message).to.eq(foldMessage);
  });

  test('a fold with no concurrent edit simply lands -- no conflict', async () => {
    const { db } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();
    const heads = A.getHeads(getObjectCore(person).getDoc());

    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), { message: 'fold: fullName -> name' });

    expect(person.name).to.eq('late');
    expect(Obj.getConflict(person, 'name')).toBeUndefined();
  });

  test('foreign heads throw rather than silently folding on an unrelated document', async () => {
    const { db: db1 } = await builder.createDatabase({ types: [Person] });
    const { db: db2 } = await builder.createDatabase({ types: [Person] });

    const person1 = db1.add(Obj.make(Person, { fullName: 'one' }));
    await db1.flush();
    const foreignHeads = A.getHeads(getObjectCore(person1).getDoc());

    const person2 = db2.add(Obj.make(Person, { fullName: 'two' }));
    await db2.flush();

    expect(() =>
      getObjectCore(person2).foldAt(foreignHeads, (data) => (data.name = 'late'), { message: 'fold: test' }),
    ).toThrow();
  });

  test('re-folding the same value at the same heads reports no conflict', async () => {
    const { db } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();
    const heads = A.getHeads(getObjectCore(person).getDoc());

    const message = 'fold: fullName -> name';
    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), { message });
    // A second, independently-authored fold of the same value at the same heads mints its own actor,
    // so Automerge keeps two ops; they agree on the value, so there is nothing to resolve.
    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), { message });

    expect(person.name).to.eq('late');
    expect(Obj.getConflict(person, 'name')).to.be.undefined;
  });
});
