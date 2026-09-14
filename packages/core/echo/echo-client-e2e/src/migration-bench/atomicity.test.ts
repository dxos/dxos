//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Annotation, DXN, Filter, Obj, Query, Relation, Type } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { type TestReplicationNetwork } from '@dxos/echo-host/testing';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  CompanyDoc,
  PersonDoc,
  type TestDatabase,
  createPartitionedPair,
  foldInto,
  headsOf,
  writesSince,
} from './harness';

//
// E5: definitive proof that multi-object non-atomicity is a REAL but TEMPORARY window, not
// permanent corruption, given an idempotent/resumable write-set runner — plus the one free
// mitigation relations get from strong-deps gating. See `.agents/projects/lenses/DESIGN.md` §10.3.
//

/** Stands in for a per-object migration-complete marker; see `single-object.test.ts` for the same idiom. */
const MigrationCompleteAnnotation = Annotation.make({
  id: 'org.dxos.test.migration.bench.atomicity.complete',
  schema: Schema.Boolean,
});

const isComplete = (person: PersonDoc): boolean =>
  Option.getOrElse(Annotation.get(person, MigrationCompleteAnnotation), () => false);

/** Write-set step 1: derive `company.industry` from `person.employerName` — guarded, idempotent. */
const stepFoldIndustry = (company: CompanyDoc, person: PersonDoc): boolean => {
  let wrote = false;
  Obj.update(company, (company) => {
    if (foldInto(company, 'industry', person.employerName ?? '')) {
      wrote = true;
    }
  });
  return wrote;
};

/** Write-set step 2: stamp the person migration-complete — guarded so a re-run is a no-op. */
const stepStampComplete = (person: PersonDoc): boolean => {
  let wrote = false;
  Obj.update(person, (person) => {
    if (!isComplete(person)) {
      Annotation.set(person, MigrationCompleteAnnotation, true);
      wrote = true;
    }
  });
  return wrote;
};

/** The FULL two-object write set: both steps, each independently guarded and idempotent. */
const runWriteSet = (company: CompanyDoc, person: PersonDoc): { step1: boolean; step2: boolean } => ({
  step1: stepFoldIndustry(company, person),
  step2: stepStampComplete(person),
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
  invariant(found, 'expected the replicated person to be queryable');
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
  invariant(found, 'expected the replicated company to be queryable');
  return found;
};

/** Local endpoint type for the claim-8 relation scenario — brand-new objects, never seen before the window. */
class RelPerson extends Type.makeObject<RelPerson>(
  DXN.make('org.dxos.test.migration.bench.atomicity.RelPerson', '0.1.0'),
)(Schema.Struct({ name: Schema.optional(Schema.String) })) {}

/** Local relation type, mirroring `migration-research-entities.test.ts`'s `HasManager` idiom. */
class HasManager extends Type.makeRelation<HasManager>(
  DXN.make('org.dxos.test.migration.bench.atomicity.HasManager', '0.1.0'),
)({
  source: RelPerson,
  target: RelPerson,
})(Schema.Struct({})) {}

/**
 * Polls for a relation of the given type on `db`, asserting that a thrown query error fails the
 * test immediately (with a distinct message) rather than being retried away — a throw while parts
 * are in flight is exactly the failure mode this test predicts must NOT happen.
 */
const pollForRelationWithoutThrowing = async (db: TestDatabase, timeoutMs: number): Promise<HasManager | undefined> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let results: HasManager[];
    try {
      results = await db.query(Query.select(Filter.type(HasManager))).run();
    } catch (error) {
      throw new Error(
        `db.query threw while polling for the cross-peer relation to surface ` +
          `(strong-deps gating predicts exclusion, never an error): ${String(error)}`,
        { cause: error },
      );
    }
    if (results.length > 0) {
      return results[0];
    }
    await sleep(50);
  }
  return undefined;
};

describe('E5: multi-object non-atomicity', () => {
  let builder: EchoTestBuilder;
  let network: TestReplicationNetwork | undefined;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
    await network?.close();
    network = undefined;
  });

  test('E5a: the window is real and replicates — half a write set propagates on its own', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, CompanyDoc]);
    network = pair.network;
    const { peer1, peer2, syncAll } = pair;

    const db1 = await peer1.createDatabase(spaceKey);
    const person1 = db1.add(Obj.make(PersonDoc, { employerName: 'Old Corp' }));
    const company1 = db1.add(Obj.make(CompanyDoc, { name: 'Old Corp Co' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const person2 = await queryPersonById(db2, person1.id);
    const company2 = await queryCompanyById(db2, company1.id);

    // Apply only the FIRST write of the set ("crash" — simply stop before step 2 ever runs).
    stepFoldIndustry(company1, person1);
    await db1.flush();

    // Per-doc replication means half a write set replicates on its own — no cross-object transaction.
    await syncAll(db1, db2);

    await expect.poll(() => company2.industry).toBe('Old Corp');
    // The inconsistent window is observable locally on peer 1 AND propagated to peer 2.
    expect(isComplete(person1)).to.eq(false);
    expect(isComplete(person2)).to.eq(false);
  });

  test('E5b: idempotent resume repairs the window; a third run performs zero writes', async ({ expect }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [PersonDoc, CompanyDoc]);
    network = pair.network;
    const { peer1, peer2, syncAll } = pair;

    const db1 = await peer1.createDatabase(spaceKey);
    const person1 = db1.add(Obj.make(PersonDoc, { employerName: 'Old Corp' }));
    const company1 = db1.add(Obj.make(CompanyDoc, { name: 'Old Corp Co' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    const person2 = await queryPersonById(db2, person1.id);
    const company2 = await queryCompanyById(db2, company1.id);

    // Establish the same window as E5a: only step 1 runs, then replicates.
    stepFoldIndustry(company1, person1);
    await db1.flush();
    await syncAll(db1, db2);
    await expect.poll(() => company2.industry).toBe('Old Corp');
    expect(isComplete(person2)).to.eq(false);

    // Resume from the OTHER peer: every write is value-compare guarded, so re-running the FULL
    // write set on peer 2 skips the already-folded step and only completes the missing half.
    const resumed = runWriteSet(company2, person2);
    expect(resumed).to.deep.eq({ step1: false, step2: true });
    await db2.flush();

    await syncAll(db1, db2);
    await expect.poll(() => isComplete(person1)).toBe(true);
    expect(company1.industry).to.eq('Old Corp');
    expect(isComplete(person2)).to.eq(true);

    // A third run, from yet another peer, performs ZERO writes — the definitive qualification:
    // not corruption, a window a resumable idempotent runner always closes.
    const preHeadsCompany = headsOf(company1);
    const preHeadsPerson = headsOf(person1);
    const thirdRun = runWriteSet(company1, person1);
    await db1.flush();

    expect(thirdRun).to.deep.eq({ step1: false, step2: false });
    expect(writesSince(company1, preHeadsCompany)).to.deep.eq([]);
    expect(writesSince(person1, preHeadsPerson)).to.deep.eq([]);
  });

  test('E5c: relations degrade gracefully during the window — refs/properties get no such protection', async ({
    expect,
  }) => {
    const [spaceKey] = PublicKey.randomSequence();
    const pair = await createPartitionedPair(builder, [RelPerson, HasManager]);
    network = pair.network;
    const { peer1, peer2, partition, heal, syncAll } = pair;

    const db1 = await peer1.createDatabase(spaceKey);
    const seed = db1.add(Obj.make(RelPerson, { name: 'seed' }));
    await db1.flush();

    const rootUrl = db1.rootUrl;
    invariant(rootUrl, 'root url');
    const db2 = await peer2.openDatabase(spaceKey, rootUrl);
    await db2.waitUntilHeadsReplicated(await db1.getDocumentHeads());
    await db2.updateIndexes();
    await expect.poll(async () => (await db2.query(Filter.id(seed.id)).run()).length).toBe(1);

    // Partition: peer 1 creates two brand-new endpoints AND a relation between them, all in one
    // go, so a real cross-peer replication race between the relation doc and its endpoints is
    // possible — the multi-object non-atomicity window, for a strong-deps-gated entity this time.
    await partition();

    const alice = db1.add(Obj.make(RelPerson, { name: 'Alice' }));
    const bob = db1.add(Obj.make(RelPerson, { name: 'Bob' }));
    const hasManager = db1.add(Relation.make(HasManager, { [Relation.Source]: bob, [Relation.Target]: alice }));
    await db1.flush();

    await heal();
    await syncAll(db1, db2);

    // Only strong-deps-gated entities get this: the relation is excluded from queries, never an
    // error, until BOTH endpoints and the relation itself have all arrived.
    const relationOnPeer2 = await pollForRelationWithoutThrowing(db2, 10_000);
    invariant(relationOnPeer2, 'expected the relation to eventually surface on peer 2 without ever throwing');
    expect(relationOnPeer2.id).to.eq(hasManager.id);

    const source = Relation.getSource(relationOnPeer2);
    const target = Relation.getTarget(relationOnPeer2);
    expect(source.id).to.eq(bob.id);
    expect(target.id).to.eq(alice.id);
    expect(source.name).to.eq('Bob');
    expect(target.name).to.eq('Alice');

    // Re-poll once more, again asserting no throw: the surfaced state is stable, not a fluke.
    const relationOnPeer2Again = await pollForRelationWithoutThrowing(db2, 2_000);
    invariant(relationOnPeer2Again, 'relation must remain queryable once surfaced');
    expect(relationOnPeer2Again.id).to.eq(hasManager.id);
  });
});
