//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Collection, Database, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { ArtifactAdd } from './definitions';

/** Compare refs by entity id when possible — space-qualified and local URIs may name the same object. */
const refKey = (ref: Ref.Ref<Obj.Unknown>): string => {
  const eid = EID.tryParse(ref.uri);
  return (eid && EID.getEntityId(eid)) ?? ref.uri;
};

const handler: Operation.WithHandler<typeof ArtifactAdd> = ArtifactAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project: projectRef, object: objectRef }) {
      const project = yield* Database.load(projectRef);

      // Projects normally own an artifacts collection from creation; materialize one for those that don't.
      let collection: Collection.Collection;
      if (project.artifacts) {
        collection = yield* Database.load(project.artifacts);
      } else {
        collection = yield* Database.add(Collection.make());
        Obj.setParent(collection, project);
        Obj.update(project, (project) => {
          project.artifacts = Ref.make(collection);
        });
      }

      if (!collection.objects.some((ref) => refKey(ref) === refKey(objectRef))) {
        Obj.update(collection, (collection) => {
          collection.objects.push(objectRef);
        });
      }

      yield* Database.flush();
    }),
  ),
);

export default handler;
