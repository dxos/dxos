//
// Copyright 2026 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Annotation, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  CompanyDoc,
  PersonDoc,
  changedProps,
  createPartitionedPair,
  diffSince,
  foldInto,
  foldValue,
  headsOf,
  recordConflict,
  type TestDatabase,
} from './harness';

//
// E2: definitive proof that N→N multi-object migration works exactly like the single-object case
// (E1), as long as each object/pair is migrated and folded on its own heads. See
// `.agents/projects/lenses/DESIGN.md` §10.3.
//

/** Stands in for `EntityMeta.version`; see `single-object.test.ts` E1a for the same idiom. */
const MigrationVersionAnnotation = Annotation.make({
  id: 'org.dxos.test.migration.bench.version',
  schema: Schema.Number,
});

/**
 * Cross-peer visibility isn't guaranteed the instant `waitUntilHeadsReplicated`/`updateIndexes`
 * resolve, so poll for the replicated object rather than reading the query result once.
 */
const queryPersonById = async (db: TestDatabase, id: string): Promise<PersonDoc> => {
  let found: PersonDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

const queryCompanyById = async (db: TestDatabase, id: string): Promise<CompanyDoc> => {
  let found: CompanyDoc | undefined;
  await expect
    .poll(async () => {
      [found] = await db.query(Filter.id(id)).run();
      return found;
    })
    .toBeDefined();
  invariant(found, 'expected the replicated object to be queryable');
  return found;
};

/**
 * The cross-object fold under test: `company.industry` from `person.employerName`, guarded and
 * conflict-aware, using heads captured independently by whichever peer calls this.
 */
const foldCompanyIndustry = (
  company: CompanyDoc,
  person: PersonDoc,
  personPreHeads: Heads,
  companyPostHeads: Heads,
): void => {
  const lateEmployer = changedProps(diffSince(person, personPreHeads), new Set(['employerName']));
  const directlyEditedIndustry = changedProps(diffSince(company, companyPostHeads), new Set(['industry']));
  if (!lateEmployer.has('employerName')) {
    return;
  }
  Obj.update(company, (company) => {
    const incoming = person.employerName ?? '';
    // Equal values can never conflict: another peer's identical fold write is indistinguishable
    // from a direct edit by heads alone, so classification must compare values before recording.
    if (company.industry === incoming) {
      return;
    }
    if (directlyEditedIndustry.has('industry')) {
      recordConflict(company, 'industry', company.industry ?? '', incoming);
    } else {
      foldInto(company, 'industry', incoming);
    }
  });
};

describe('E2: N→N multi-object migration works like single-object', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    // Peers must close before the network so replicator teardown runs against a live network —
    // and this ordering must hold on the assertion-failure path too, which an in-test
    // `await using network` cannot guarantee.
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('E2a: two independently-migrated objects fold independently under the same partition — one converges cleanly, the other resolves a genuine conflict, and neither affects the other', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const objA1 = db1.add(Obj.make(PersonDoc, { fullName: 'Person A', status: 'in-progress' }));
    const objB1 = db1.add(Obj.make(PersonDoc, { fullName: 'Person B', status: 'in-progress' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const objA2 = await queryPersonById(db2, objA1.id);
    const objB2 = await queryPersonById(db2, objB1.id);

    // Migrate each object independently: its own pre/post heads, its own marker.
    const preHeadsA = headsOf(objA1);
    Obj.update(objA1, (objA1) => {
      foldValue(objA1, 'fullName', 'name');
      foldInto(objA1, 'done', objA1.status === 'done');
      Annotation.set(objA1, MigrationVersionAnnotation, 1);
    });
    const preHeadsB = headsOf(objB1);
    Obj.update(objB1, (objB1) => {
      foldValue(objB1, 'fullName', 'name');
      foldInto(objB1, 'done', objB1.status === 'done');
      Annotation.set(objB1, MigrationVersionAnnotation, 1);
    });
    await db1.flush();
    const postHeadsA = headsOf(objA1);
    const postHeadsB = headsOf(objB1);

    await partition();

    // Peer 2 late-writes the source property on BOTH objects, old-schema style.
    Obj.update(objA2, (objA2) => {
      objA2.fullName = 'A late';
    });
    Obj.update(objB2, (objB2) => {
      objB2.fullName = 'B late';
    });
    await db2.flush();

    // Peer 1 directly edits B's target ONLY — A gets no concurrent direct edit, so A's fold is clean.
    Obj.update(objB1, (objB1) => {
      objB1.name = 'B direct';
    });
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => objA1.fullName).toBe('A late');
    await expect.poll(() => objB1.fullName).toBe('B late');
    expect(objB1.name).to.eq('B direct');

    // Fold A: unconflicted, folds through cleanly.
    const lateA = changedProps(diffSince(objA1, preHeadsA), new Set(['fullName']));
    const editedA = changedProps(diffSince(objA1, postHeadsA), new Set(['name']));
    expect([...lateA]).to.deep.eq(['fullName']);
    expect([...editedA]).to.deep.eq([]);
    Obj.update(objA1, (objA1) => {
      if (lateA.has('fullName') && !editedA.has('name')) {
        foldValue(objA1, 'fullName', 'name');
      }
    });

    // Fold B: genuine conflict, recorded, `name` not overwritten.
    const lateB = changedProps(diffSince(objB1, preHeadsB), new Set(['fullName']));
    const editedB = changedProps(diffSince(objB1, postHeadsB), new Set(['name']));
    expect([...lateB]).to.deep.eq(['fullName']);
    expect([...editedB]).to.deep.eq(['name']);
    Obj.update(objB1, (objB1) => {
      if (lateB.has('fullName') && editedB.has('name')) {
        recordConflict(objB1, 'name', objB1.name ?? '', objB1.fullName ?? '');
      }
    });
    await db1.flush();

    expect(objA1.name).to.eq('A late');
    expect(objA1.conflicts).to.eq(undefined); // B's conflict never leaks onto A.
    expect(objB1.name).to.eq('B direct');
    expect(objB1.conflicts?.name).to.deep.eq({ mine: 'B direct', theirs: 'B late' });

    // Both objects converge on both peers, independently of each other.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => objA2.name).toBe('A late');
    await expect.poll(() => objB2.conflicts?.name).toBeDefined();
    expect(objB2.conflicts?.name).to.deep.eq({ mine: 'B direct', theirs: 'B late' });
    expect(objA2.conflicts).to.eq(undefined);
  });

  test('E2b: a cross-object move (person.employerName -> company.industry) writes a DIFFERENT object, is guarded and conflict-aware on both the clean and the conflicting path, and both peers folding independently converge', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, CompanyDoc]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    await using db1 = await peer1.createDatabase(spaceKey);
    const personClean1 = db1.add(Obj.make(PersonDoc, { employerName: 'Old Corp' }));
    const companyClean1 = db1.add(Obj.make(CompanyDoc, { name: 'Old Corp Co' }));
    const personConflict1 = db1.add(Obj.make(PersonDoc, { employerName: 'Old Corp' }));
    const companyConflict1 = db1.add(Obj.make(CompanyDoc, { name: 'Old Corp Co' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    await using db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const personClean2 = await queryPersonById(db2, personClean1.id);
    const companyClean2 = await queryCompanyById(db2, companyClean1.id);
    const personConflict2 = await queryPersonById(db2, personConflict1.id);
    const companyConflict2 = await queryCompanyById(db2, companyConflict1.id);

    // Migration: write company.industry from person.employerName, KEEPING the source property.
    const personCleanPreHeads1 = headsOf(personClean1);
    const personConflictPreHeads1 = headsOf(personConflict1);
    Obj.update(companyClean1, (companyClean1) => {
      foldInto(companyClean1, 'industry', personClean1.employerName ?? '');
    });
    Obj.update(companyConflict1, (companyConflict1) => {
      foldInto(companyConflict1, 'industry', personConflict1.employerName ?? '');
    });
    await db1.flush();
    const companyCleanPostHeads1 = headsOf(companyClean1);
    const companyConflictPostHeads1 = headsOf(companyConflict1);

    // Sync BEFORE partitioning: peer 2 can then capture the SAME post-migration heads independently.
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(() => companyClean2.industry).toBe('Old Corp');
    const personCleanPreHeads2 = headsOf(personClean2);
    const personConflictPreHeads2 = headsOf(personConflict2);
    const companyCleanPostHeads2 = headsOf(companyClean2);
    const companyConflictPostHeads2 = headsOf(companyConflict2);

    await partition();

    // Peer 2, an old-schema client, keeps writing the source property directly on BOTH persons.
    Obj.update(personClean2, (personClean2) => {
      personClean2.employerName = 'Acme Corp';
    });
    Obj.update(personConflict2, (personConflict2) => {
      personConflict2.employerName = 'Acme Corp';
    });
    await db2.flush();

    // Peer 1 directly edits ONLY the conflict pair's target, through the new schema.
    Obj.update(companyConflict1, (companyConflict1) => {
      companyConflict1.industry = 'Direct Industry';
    });
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    await expect.poll(() => personClean1.employerName).toBe('Acme Corp');
    await expect.poll(() => personConflict1.employerName).toBe('Acme Corp');
    expect(companyConflict1.industry).to.eq('Direct Industry');

    // Fold on peer 1: the clean pair converges; the conflict pair preserves the direct edit and
    // records what the late write would have overwritten.
    foldCompanyIndustry(companyClean1, personClean1, personCleanPreHeads1, companyCleanPostHeads1);
    foldCompanyIndustry(companyConflict1, personConflict1, personConflictPreHeads1, companyConflictPostHeads1);
    await db1.flush();

    expect(companyClean1.industry).to.eq('Acme Corp');
    expect(personClean1.employerName).to.eq('Acme Corp'); // source kept.
    expect(companyClean1.conflicts).to.eq(undefined);

    expect(companyConflict1.industry).to.eq('Direct Industry'); // not clobbered.
    expect(companyConflict1.conflicts?.industry).to.deep.eq({ mine: 'Direct Industry', theirs: 'Acme Corp' });
    expect(personConflict1.employerName).to.eq('Acme Corp'); // source kept.

    // Fold on peer 2: independently, from ITS OWN pre/post heads, over the same merged input —
    // deterministic derivation, so it writes the exact same values peer 1 did.
    foldCompanyIndustry(companyClean2, personClean2, personCleanPreHeads2, companyCleanPostHeads2);
    foldCompanyIndustry(companyConflict2, personConflict2, personConflictPreHeads2, companyConflictPostHeads2);
    await db2.flush();

    await syncAll(db1, db2);

    await expect.poll(() => companyClean2.industry).toBe('Acme Corp');
    expect(companyClean1.industry).to.eq('Acme Corp');
    expect(companyClean1.conflicts).to.eq(undefined);
    expect(companyClean2.conflicts).to.eq(undefined);

    await expect.poll(() => companyConflict2.conflicts?.industry).toBeDefined();
    expect(companyConflict2.conflicts?.industry).to.deep.eq({ mine: 'Direct Industry', theirs: 'Acme Corp' });
    expect(companyConflict1.conflicts?.industry).to.deep.eq(companyConflict2.conflicts?.industry);
    await expect.poll(() => companyConflict2.industry).toBe('Direct Industry');
    expect(companyConflict1.industry).to.eq('Direct Industry');

    // Atomicity of the person/company pair (e.g. one write landing without the other) is E5's
    // subject, not asserted here — this test only proves the guarded cross-object write pattern.
  });
});
