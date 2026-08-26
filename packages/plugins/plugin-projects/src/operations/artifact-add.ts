//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { ProjectOperation } from '#types';

/** Compare refs by entity id when possible — space-qualified and local URIs may name the same object. */
const refKey = (ref: Ref.Ref<Obj.Unknown>): string => {
  const eid = EID.tryParse(ref.uri);
  return (eid && EID.getEntityId(eid)) ?? ref.uri;
};

const handler: Operation.WithHandler<typeof ProjectOperation.ArtifactAdd> = ProjectOperation.ArtifactAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project: projectRef, object: objectRef }) {
      const project = yield* Database.load(projectRef);

      if (!project.artifacts.some((ref) => refKey(ref) === refKey(objectRef))) {
        Obj.update(project, (project) => {
          project.artifacts = [...project.artifacts, objectRef];
        });
      }

      yield* Database.flush();
    }),
  ),
);

export default handler;
