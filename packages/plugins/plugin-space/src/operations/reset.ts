// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { SpaceProperties } from '@dxos/client-protocol';
import { type Space } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Collection, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
import { Migrations } from '@dxos/migrations';

import { SpaceOperation } from './definitions';

/**
 * Typenames the reset operation must NOT remove. Without `SpaceProperties`,
 * `SpaceProxy._initializeDb` never wakes its `propertiesAvailable` trigger on the next
 * session start, so `space.properties` throws "Space is not initialized." and every
 * container that reads it crashes.
 */
const SYSTEM_TYPENAMES = new Set<string>([Type.getTypename(SpaceProperties)]);

const handler: Operation.WithHandler<typeof SpaceOperation.Reset> = SpaceOperation.Reset.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      const { space } = input;
      log.info('reset: invoked', { spaceId: space.id });

      log.info('reset: snapshotting entities');
      const allEntities = snapshotEntities(space);
      const entities = allEntities.filter((entity) => !SYSTEM_TYPENAMES.has(Obj.getTypename(entity) ?? ''));
      const preserved = allEntities.length - entities.length;
      const relations = entities.filter(Relation.isRelation);
      const objects = entities.filter((entity) => !Relation.isRelation(entity));
      if (preserved > 0) {
        log.info('reset: preserving system entities', { preserved });
      }

      log.info('reset: reading schema registry');
      const schemas = space.db.schemaRegistry.query().runSync();

      const feeds =
        (space.internal.data.pipeline?.controlFeeds?.length ?? 0) +
        (space.internal.data.pipeline?.dataFeeds?.length ?? 0);
      log.info('reset: counts', {
        spaceId: space.id,
        entities: entities.length,
        objects: objects.length,
        relations: relations.length,
        schemas: schemas.length,
        feeds,
        types: entities.map((entity) => Obj.getTypename(entity) ?? '<unknown>'),
      });

      let removed = 0;
      const failures: Array<{ id: string; typename: string; error: string }> = [];
      let firstError: unknown;
      for (const entity of entities) {
        try {
          space.db.remove(entity);
          removed += 1;
        } catch (err) {
          firstError ??= err;
          const typename = Obj.getTypename(entity) ?? '<unknown>';
          const message = err instanceof Error ? err.message : String(err);
          failures.push({ id: entity.id, typename, error: message });
          log.warn('reset: remove threw', { id: entity.id, typename, error: message });
        }
      }
      log.info('reset: removed', { removed, failed: failures.length, total: entities.length });
      if (failures.length > 0) {
        // Bail before flush/createEpoch — proceeding would leave a partially reset space while the
        // caller saw success.
        throw new Error(
          `reset failed: ${failures.length}/${entities.length} entities could not be removed` +
            ` (first failure on ${failures[0].id} [${failures[0].typename}]: ${failures[0].error})`,
          { cause: firstError instanceof Error ? firstError : undefined },
        );
      }

      // Rebuild the minimum structure the rest of Composer depends on so the space stays usable.
      log.info('reset: rebuilding space root');
      rebuildSpaceRoot(space);

      log.info('reset: flushing');
      await space.db.flush();
      log.info('reset: flushed');

      log.info('reset: creating epoch');
      try {
        await space.internal.createEpoch();
        log.info('reset: epoch created');
      } catch (err) {
        log.error('reset: createEpoch threw', {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      const afterEntities = snapshotEntities(space);
      const afterSchemas = space.db.schemaRegistry.query().runSync();
      const afterFeeds =
        (space.internal.data.pipeline?.controlFeeds?.length ?? 0) +
        (space.internal.data.pipeline?.dataFeeds?.length ?? 0);
      log.info('reset: done', {
        spaceId: space.id,
        remainingEntities: afterEntities.length,
        remainingSchemas: afterSchemas.length,
        remainingFeeds: afterFeeds,
        remainingTypes: afterEntities.map((entity) => Obj.getTypename(entity) ?? '<unknown>'),
      });
    }),
  ),
);
export default handler;

/**
 * Returns a synchronous snapshot of every entity in the space's database.
 *
 * We deliberately avoid `query.run()` here. In a live Composer environment,
 * `space.db.query(Filter.everything()).run()` never resolves (the call hangs until the
 * operation runtime cancels it at 30s), even though it works fine in node unit tests
 * against a fresh in-memory client. `run()` waits for every query source to reach a
 * stable state, and the indexed-storage source apparently never reports "done" for the
 * everything-filter. Subscribing primes the local source and `runSync()` then returns
 * the in-memory results immediately.
 */
const snapshotEntities = (space: Space): Obj.Unknown[] => {
  const query = space.db.query(Filter.everything());
  const unsubscribe = query.subscribe(() => {}, { fire: true });
  try {
    return query.runSync() as Obj.Unknown[];
  } finally {
    unsubscribe();
  }
};

/**
 * Schema-defined keys on `SpaceProperties` that survive a reset. Anything else on the open
 * `{ key: string, value: any }` record (Ref to the root Collection, plugin-specific anchors, etc.)
 * points to objects we just removed — leaving those refs in place produces "not found" errors in
 * containers that load them. We blank them out and re-seed the root Collection so the navtree
 * has something to render.
 */
const SPACE_PROPERTY_TYPED_KEYS = new Set<string>([
  'archived',
  'edgeReplication',
  'invocationTraceFeed',
  'computeEnvironment',
  'name',
  'icon',
  'hue',
]);

const rebuildSpaceRoot = (space: Space): void => {
  const properties = space.properties;
  const versionKey = Migrations.versionProperty;
  const preservedVersion = versionKey ? (properties as Record<string, any>)[versionKey] : undefined;
  const cleared: string[] = [];

  Obj.update(properties, (properties) => {
    const record = properties as unknown as Record<string, any>;
    for (const key of Object.keys(record)) {
      if (key === 'id' || key === '@meta') {
        continue;
      }
      if (SPACE_PROPERTY_TYPED_KEYS.has(key)) {
        continue;
      }
      if (versionKey && key === versionKey) {
        continue;
      }
      delete record[key];
      cleared.push(key);
    }

    // Re-seed the root Collection (the navtree anchor).
    record[Type.getTypename(Collection.Collection)] = Ref.make(Collection.make());

    // Make sure the migrations version still pins the schema at the latest known target so the
    // reloaded space doesn't fall into SPACE_REQUIRES_MIGRATION.
    if (versionKey) {
      record[versionKey] = preservedVersion ?? Migrations.targetVersion;
    }
  });

  log.info('reset: space root rebuilt', { cleared });
};
