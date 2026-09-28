//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Filter, Obj, Type } from '@dxos/echo';
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
      { message: foldMessage, scope: person.id },
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

    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), {
      message: 'fold: fullName -> name',
      scope: person.id,
    });

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
      getObjectCore(person2).foldAt(foreignHeads, (data) => (data.name = 'late'), {
        message: 'fold: test',
        scope: person2.id,
      }),
    ).toThrow();
  });

  test('re-folding the same value at the same heads reports no conflict', async () => {
    const { db } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();
    const heads = A.getHeads(getObjectCore(person).getDoc());

    const message = 'fold: fullName -> name';
    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), { message, scope: person.id });
    // A second fold at the same heads reuses this peer's SAME derived fold actor (forked from `heads`
    // plus the first fold's own change, so its seq continues); whether Automerge keeps it as a second,
    // dominated op or coalesces it, the two agree on the value, so there is nothing to resolve.
    getObjectCore(person).foldAt(heads, (data) => (data.name = 'late'), { message, scope: person.id });

    expect(person.name).to.eq('late');
    expect(Obj.getConflict(person, 'name')).to.be.undefined;
  });

  test('10 successive folds in one scope add exactly one extra actor; a second scope adds one more', async () => {
    const { db } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();
    const core = getObjectCore(person);
    const heads = A.getHeads(core.getDoc());
    const actorsBefore = new Set(A.getAllChanges(core.getDoc()).map((change) => A.decodeChange(change).actor));

    // Ten folds in step 0's scope: the SAME derived actor every time -- not a fresh one per call.
    const scopeStep0 = `${person.id}:0`;
    for (let i = 0; i < 10; i++) {
      const newHeads = core.foldAt(heads, (data) => (data.name = `late-${i}`), {
        message: 'fold: fullName -> name',
        scope: scopeStep0,
      });
      expect(newHeads, `fold ${i} should produce a change`).toBeDefined();
    }

    const actorsAfterStep0 = new Set(A.getAllChanges(core.getDoc()).map((change) => A.decodeChange(change).actor));
    expect(actorsAfterStep0.size).to.eq(actorsBefore.size + 1);

    // A DIFFERENT step on the SAME object gets a DIFFERENT derived actor -- one per (object, step)
    // scope, never one shared across an object's whole migration chain.
    const scopeStep1 = `${person.id}:1`;
    core.foldAt(heads, (data) => (data.fullName = 'late-other-scope'), {
      message: 'fold: other step',
      scope: scopeStep1,
    });

    const actorsAfterStep1 = new Set(A.getAllChanges(core.getDoc()).map((change) => A.decodeChange(change).actor));
    expect(actorsAfterStep1.size).to.eq(actorsBefore.size + 2);
  });

  test('folding survives a peer restart: a fresh ObjectCore/db over the same document derives its own actor with no merge error', async () => {
    const { db, peer } = await builder.createDatabase({ types: [Person] });

    const person = db.add(Obj.make(Person, { fullName: 'original' }));
    await db.flush();
    const heads = A.getHeads(getObjectCore(person).getDoc());
    const scope = person.id;
    const firstFoldHeads = getObjectCore(person).foldAt(heads, (data) => (data.name = 'late-before-restart'), {
      message: 'fold: fullName -> name',
      scope,
    });
    expect(firstFoldHeads).toBeDefined();
    await db.flush();

    // Simulates the process restarting: the peer's whole ECHO stack (and every `DocHandleProxy`, whose
    // `A.init()` mints a fresh random local actor on every load) is torn down and recreated over the
    // same on-disk document.
    await peer.reload();
    const db2 = await peer.openLastDatabase();
    const [person2] = await db2.query(Filter.id(person.id)).run();
    invariant(person2, 'expected the object to survive the reload');

    // The restarted session's own fold, forked from the SAME recorded heads under a BRAND NEW derived
    // actor (this peer's local actor id is fresh-random per load): concurrent with the pre-restart
    // fold, exactly like two peers folding independently -- never a merge error.
    expect(() =>
      getObjectCore(person2).foldAt(heads, (data) => (data.name = 'late-after-restart'), {
        message: 'fold: fullName -> name',
        scope,
      }),
    ).not.toThrow();
    await db2.flush();

    // Well-formed either way: both folds are legitimately concurrent, so Automerge keeps both as
    // conflict alternatives rather than the restart silently losing one.
    const conflict = Obj.getConflict(person2, 'name');
    invariant(conflict, 'expected both folds to surface as alternatives');
    expect(conflict.alternatives.map((alternative) => alternative.value).sort()).to.deep.eq([
      'late-after-restart',
      'late-before-restart',
    ]);
  });
});
