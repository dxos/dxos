//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Annotation, Filter, Obj } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { Publication, SpaceOperation } from '#types';

import { PublishingDisabledError } from '../errors.ts';
import { fetchArchive, resolvePublicationsUrl } from '../publication/publication-client.ts';
import { SpaceOperationConfig } from './helpers.ts';

const handler: Operation.WithHandler<typeof SpaceOperation.ForkPublication> = SpaceOperation.ForkPublication.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ publicId, path }) {
      const { publication } = yield* Capability.get(SpaceOperationConfig);
      if (!publication) {
        return yield* Effect.fail(new PublishingDisabledError());
      }
      const archive = yield* fetchArchive(resolvePublicationsUrl(publication), publicId);
      const { space } = yield* Operation.invoke(SpaceOperation.ImportSpace, { archive });

      // The fork is a new space of the caller's; the source's publication record is not its own.
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, Publication.ReceiptAnnotation, null);
      });
      // The archive carries the publisher's migration version, or none, so the fork is brought up to
      // this app's version rather than left asking its new owner to migrate it.
      yield* Operation.invoke(SpaceOperation.Migrate, { space });

      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(space.id) });
      // The viewer's path reaches the object by any route (database or collection); JSON import keeps
      // object ids, so the fork opens the object the path ends in at its own path.
      const objectId = path && (Publication.parseObjectPath(path)?.objectId ?? objectIdOf(space.id, path));
      const object = objectId ? yield* Effect.promise(() => space.db.query(Filter.id(objectId)).first()) : undefined;
      if (object) {
        yield* Operation.invoke(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
      }
      return { space };
    }),
  ),
);

const objectIdOf = (spaceId: string, path: string): string | undefined => {
  const eid = GraphPath.getEidFromPath(GraphPath.getSpacePath(spaceId, path));
  return eid && EID.getEntityId(eid);
};

export default handler;
