// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Filter, Obj, Relation } from '@dxos/echo';
import { log } from '@dxos/log';

import { SpaceOperation } from './definitions';

const handler: Operation.WithHandler<typeof SpaceOperation.Reset> = SpaceOperation.Reset.pipe(
  Operation.withHandler((input) =>
    Effect.promise(async () => {
      const { space } = input;
      log.info('reset: invoked', { spaceId: space.id });

      const entities = await space.db.query(Filter.everything()).run();
      const relations = entities.filter(Relation.isRelation);
      const objects = entities.filter((entity) => !Relation.isRelation(entity));
      const schemas = space.db.schemaRegistry.query().runSync();
      const feeds =
        (space.internal.data.pipeline?.controlFeeds?.length ?? 0) +
        (space.internal.data.pipeline?.dataFeeds?.length ?? 0);
      log.info('reset: starting', {
        spaceId: space.id,
        entities: entities.length,
        objects: objects.length,
        relations: relations.length,
        schemas: schemas.length,
        feeds,
        types: entities.map((entity) => Obj.getTypename(entity) ?? '<unknown>'),
      });

      let removed = 0;
      let removeErrors = 0;
      for (const entity of entities) {
        try {
          space.db.remove(entity);
          removed += 1;
        } catch (err) {
          removeErrors += 1;
          log.warn('reset: remove threw', {
            id: entity.id,
            typename: Obj.getTypename(entity) ?? '<unknown>',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      log.info('reset: removed', { removed, removeErrors, total: entities.length });

      await space.db.flush();
      log.info('reset: flushed');

      try {
        await space.internal.createEpoch();
        log.info('reset: epoch created');
      } catch (err) {
        log.error('reset: createEpoch threw', {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      const afterEntities = await space.db.query(Filter.everything()).run();
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
