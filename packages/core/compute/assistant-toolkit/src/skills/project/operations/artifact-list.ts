//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { ArtifactList } from './definitions';

const handler: Operation.WithHandler<typeof ArtifactList> = ArtifactList.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ project: projectRef }) {
      const project = yield* Database.load(projectRef);
      if (!project.artifacts) {
        return { artifacts: [] };
      }

      const collection = yield* Database.load(project.artifacts);
      const artifacts = yield* Effect.forEach(collection.objects, (ref) =>
        Database.load(ref).pipe(
          Effect.map((object) => ({
            dxn: Obj.getURI(object),
            typename: Obj.getTypename(object),
            label: Obj.getLabel(object),
          })),
          // A broken ref yields a placeholder row rather than failing the whole listing.
          Effect.orElseSucceed(() => ({ dxn: ref.uri, typename: undefined, label: undefined })),
        ),
      );

      return { artifacts };
    }),
  ),
);

export default handler;
