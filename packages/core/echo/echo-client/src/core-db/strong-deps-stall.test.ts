//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { asyncTimeout, sleep } from '@dxos/async';
import { Filter, Obj } from '@dxos/echo';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { TestSchema } from '@dxos/echo/testing';
import { EID, EntityId } from '@dxos/keys';
import { openAndClose } from '@dxos/test-utils';

import { EchoTestBuilder } from '../testing';

// Originally reproduced the stall observed in
// composer-logs-2026-05-15T13-18-07.ndjson: running
// `Query.select(Filter.everything())` from the console never completed when
// an indexed object had a strong dependency (e.g. its dynamic schema)
// referenced by the space root but whose chunks were not on disk and there
// was no peer to fetch them from. The query pipeline landed on
// `entityManager.loadObjectCoreById`, which waited on `_updateEvent` until
// the object was materialized AND `_areDepsSatisfied(core)` returned true,
// hanging forever when the dep document was unreachable.
//
// After the `pending → requesting → ready` state machine + `diskOnly`
// option landed, query-driven loads no longer block on the network: when
// the dep doc's disk probe completes negative the loader emits
// `onObjectUnavailable`, the parent's deps become "resolved" (loaded OR
// unavailable), and `loadObjectCoreById({ diskOnly: true })` resolves
// promptly with `undefined` (or, with `returnWithUnsatisfiedDeps: true`,
// the partial core).
describe('Query pipeline strong-dependency stalls', () => {
  test('loadObjectCoreById({ diskOnly: true }) resolves to undefined when a strong-dep document is unreachable', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { peer, db } = await testBuilder.createDatabase();

    const mainObjectId = EntityId.random();
    const depObjectId = EntityId.random();

    // 1. Plant the "main" object's document on the worker's disk. Its
    //    `system.type` references depObjectId via a local-space DXN, which
    //    `ObjectCore.getStrongDependencies` returns as a strong dep.
    const mainDocHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [mainObjectId]: {
          meta: { keys: [] },
          data: { title: 'main' },
          system: {
            kind: 'object',
            type: { '/': EID.make({ entityId: depObjectId }) },
          },
        },
      },
    });

    // 2. Mint a real-looking, unreachable URL for the dep document. We
    //    create it on a SEPARATE, isolated peer that is never connected to
    //    the test peer's network, so the chunks live only on the source
    //    peer's disk.
    const sourceBuilder = new EchoTestBuilder();
    await openAndClose(sourceBuilder);
    const sourcePeer = await sourceBuilder.createPeer();
    const orphanDepHandle = await sourcePeer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [depObjectId]: {
          meta: { keys: [] },
          data: { name: 'unreachable-dep' },
          system: { kind: 'object' },
        },
      },
    });
    const unreachableUrl = orphanDepHandle.url;

    // 3. Wire both objects into the local space root. Main is reachable on
    //    disk via `links[mainObjectId]`; dep is *advertised* via
    //    `links[depObjectId]` but its underlying chunks never arrive.
    const spaceRootHandle = db.entityManager.getSpaceRootDocHandle();
    spaceRootHandle.change((newDoc: DatabaseDirectory) => {
      newDoc.links ??= {};
      newDoc.links[mainObjectId] = new A.RawString(mainDocHandle.url);
      newDoc.links[depObjectId] = new A.RawString(unreachableUrl);
    });

    // 4. Let the link change round-trip and the loader discover both
    //    links.
    await sleep(200);

    // 5. Ask the core DB for main via the same disk-only entry point used
    //    by the query pipeline (see `EchoClient._loadObjectFromDocument`).
    //    Must resolve quickly with `undefined`: dep doc's disk probe
    //    returns negative -> `onObjectUnavailable` fires -> main's deps
    //    are "resolved" (unavailable) -> wait predicate fires.
    const resolved = await asyncTimeout(db.entityManager.loadObjectCoreById(mainObjectId, { diskOnly: true }), 1000);
    expect(resolved).toBeUndefined();

    // 6. With `returnWithUnsatisfiedDeps: true` the partial core is
    //    returned so callers that explicitly opt in can still see the
    //    object body even when its strong deps are unavailable.
    const partial = await asyncTimeout(
      db.entityManager.loadObjectCoreById(mainObjectId, {
        diskOnly: true,
        returnWithUnsatisfiedDeps: true,
      }),
      1000,
    );
    expect(partial).toBeDefined();
    expect(partial!.id).toEqual(mainObjectId);
  });

  // Same scenario, but via the default (non-`diskOnly`) entry point used by
  // `db.loadObjectById(id)`. The fix unifies the two paths: recursive
  // strong-dep loads always use `diskOnly: true` internally, so an
  // unreachable dep also resolves the user-facing wait quickly with
  // `undefined` instead of hanging forever.
  test('loadObjectCoreById without diskOnly resolves to undefined when a strong-dep document is unreachable', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { peer, db } = await testBuilder.createDatabase();

    const mainObjectId = EntityId.random();
    const depObjectId = EntityId.random();

    const mainDocHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [mainObjectId]: {
          meta: { keys: [] },
          data: { title: 'main' },
          system: {
            kind: 'object',
            type: { '/': EID.make({ entityId: depObjectId }) },
          },
        },
      },
    });

    const sourceBuilder = new EchoTestBuilder();
    await openAndClose(sourceBuilder);
    const sourcePeer = await sourceBuilder.createPeer();
    const orphanDepHandle = await sourcePeer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [depObjectId]: {
          meta: { keys: [] },
          data: { name: 'unreachable-dep' },
          system: { kind: 'object' },
        },
      },
    });
    const unreachableUrl = orphanDepHandle.url;

    const spaceRootHandle = db.entityManager.getSpaceRootDocHandle();
    spaceRootHandle.change((newDoc: DatabaseDirectory) => {
      newDoc.links ??= {};
      newDoc.links[mainObjectId] = new A.RawString(mainDocHandle.url);
      newDoc.links[depObjectId] = new A.RawString(unreachableUrl);
    });

    await sleep(200);

    const resolved = await asyncTimeout(db.entityManager.loadObjectCoreById(mainObjectId), 1000);
    expect(resolved).toBeUndefined();
  });

  // Same scenario but with a 3-deep strong-dep chain (`A → B → C`, C
  // unreachable). Verifies that `_onObjectUnavailable` walks transitive
  // dependents so a waiter for the root resolves promptly instead of
  // staying parked because only `C → B` is in the index at unavailable
  // time. Regression check for the BFS in `_onObjectUnavailable`.
  test('loadObjectCoreById resolves to undefined when a transitive strong-dep document is unreachable', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { peer, db } = await testBuilder.createDatabase();

    const aId = EntityId.random();
    const bId = EntityId.random();
    const cId = EntityId.random();

    // A depends on B (via system.type); B depends on C (same).
    const aHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [aId]: {
          meta: { keys: [] },
          data: { title: 'A' },
          system: { kind: 'object', type: { '/': EID.make({ entityId: bId }) } },
        },
      },
    });
    const bHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [bId]: {
          meta: { keys: [] },
          data: { title: 'B' },
          system: { kind: 'object', type: { '/': EID.make({ entityId: cId }) } },
        },
      },
    });

    const sourceBuilder = new EchoTestBuilder();
    await openAndClose(sourceBuilder);
    const sourcePeer = await sourceBuilder.createPeer();
    const orphanCHandle = await sourcePeer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [cId]: { meta: { keys: [] }, data: { title: 'C' }, system: { kind: 'object' } },
      },
    });

    const spaceRootHandle = db.entityManager.getSpaceRootDocHandle();
    spaceRootHandle.change((newDoc: DatabaseDirectory) => {
      newDoc.links ??= {};
      newDoc.links[aId] = new A.RawString(aHandle.url);
      newDoc.links[bId] = new A.RawString(bHandle.url);
      newDoc.links[cId] = new A.RawString(orphanCHandle.url);
    });

    await sleep(200);

    const resolved = await asyncTimeout(db.entityManager.loadObjectCoreById(aId), 1000);
    expect(resolved).toBeUndefined();
  });

  test('db.query(Filter.everything()).run() completes and excludes objects with permanently unavailable strong deps', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { peer, db } = await testBuilder.createDatabase();

    const mainObjectId = EntityId.random();
    const depObjectId = EntityId.random();

    const mainDocHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [mainObjectId]: {
          meta: { keys: [] },
          data: { title: 'main' },
          system: {
            kind: 'object',
            type: { '/': EID.make({ entityId: depObjectId }) },
          },
        },
      },
    });

    const sourceBuilder = new EchoTestBuilder();
    await openAndClose(sourceBuilder);
    const sourcePeer = await sourceBuilder.createPeer();
    const orphanDepHandle = await sourcePeer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [depObjectId]: {
          meta: { keys: [] },
          data: { name: 'unreachable-dep' },
          system: { kind: 'object' },
        },
      },
    });

    const spaceRootHandle = db.entityManager.getSpaceRootDocHandle();
    spaceRootHandle.change((newDoc: DatabaseDirectory) => {
      newDoc.links ??= {};
      newDoc.links[mainObjectId] = new A.RawString(mainDocHandle.url);
      newDoc.links[depObjectId] = new A.RawString(orphanDepHandle.url);
    });

    await sleep(200);

    // Main object is materialized locally but its schema dep is unreachable.
    const core = db.entityManager.getObjectCoreById(mainObjectId, { load: false });
    expect(core).toBeDefined();
    expect(db.entityManager.areStrongDepsSatisfied(core!)).toBe(false);

    const results = await asyncTimeout(db.query(Filter.everything()).run({ timeout: 1000 }), 2000);
    expect(results.some((object) => object.id === mainObjectId)).toBe(false);
  });

  // A prior `diskOnly` probe marks an id unavailable while the object is transient; after local
  // `db.add() + flush()` the mark must be cleared so index-query hydration surfaces the object.
  test('diskOnly load surfaces a locally-persisted object whose id was probed while still absent', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { db } = await testBuilder.createDatabase({ types: [TestSchema.Expando] });

    // Mirror the transient companion chat: the object is resolved by id (e.g. graph-builder ref
    // resolution / a reactive query) BEFORE it is added to the space. The diskOnly probe marks the
    // id unavailable because it is absent from the space directory.
    const object = Obj.make(TestSchema.Expando, { name: 'companion-chat' });
    const probe = await asyncTimeout(db.entityManager.loadObjectCoreById(object.id, { diskOnly: true }), 1000);
    expect(probe, 'absent id resolves to undefined and is marked unavailable').toBeUndefined();

    // Persist locally — mirrors SpaceOperation.AddObject + flush on first submit.
    db.add(object);
    await db.flush();

    // The reactive index query now returns this object; client hydration uses the same diskOnly
    // entry point (EchoClient._loadObjectFromDocument). It MUST resolve the now-present object
    // rather than short-circuiting on the stale unavailable mark.
    const resolved = await asyncTimeout(db.entityManager.loadObjectCoreById(object.id, { diskOnly: true }), 1000);
    expect(resolved, 'locally-persisted object must resolve despite a stale unavailable mark').toBeDefined();
    expect(resolved!.id).toEqual(object.id);
  });

  // A dep id absent from the space directory was never loaded nor marked unavailable, so
  // `_areDepsResolved` stayed false and query hydration hung until an external timeout dropped the
  // hit. Now directory-absent ids are marked unavailable immediately.
  test('query completes promptly and excludes objects whose strong dep is absent from the space directory', async () => {
    const testBuilder = new EchoTestBuilder();
    await openAndClose(testBuilder);
    const { peer, db } = await testBuilder.createDatabase();

    const mainObjectId = EntityId.random();
    const danglingDepId = EntityId.random();

    const mainDocHandle = await peer.host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceKey: db.spaceKey.toHex() },
      objects: {
        [mainObjectId]: {
          meta: { keys: [] },
          data: { title: 'main' },
          system: {
            kind: 'object',
            type: { '/': EID.make({ entityId: danglingDepId }) },
          },
        },
      },
    });

    // Link only the main object — the dep id has no entry in the directory at all.
    const spaceRootHandle = db.entityManager.getSpaceRootDocHandle();
    spaceRootHandle.change((newDoc: DatabaseDirectory) => {
      newDoc.links ??= {};
      newDoc.links[mainObjectId] = new A.RawString(mainDocHandle.url);
    });

    await sleep(200);

    // The dangling dep resolves as unavailable instead of parking forever, so the
    // load completes promptly with `undefined` (deps unsatisfied → object omitted).
    const begin = performance.now();
    const loaded = await asyncTimeout(db.entityManager.loadObjectCoreById(mainObjectId, { diskOnly: true }), 1000);
    expect(loaded).toBeUndefined();

    const results = await asyncTimeout(db.query(Filter.everything()).run({ timeout: 1000 }), 2000);
    expect(results.some((object) => object.id === mainObjectId)).toBe(false);
    // Well under the per-hit hydration timeout — no stall, no timeout-driven completion.
    expect(performance.now() - begin).toBeLessThan(1500);
  });
});
