//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { Repo } from '@dxos/types';

import { ClaudeAgentOperation } from '#types';

/** Compares refs by entity id: a space-qualified and a local URI may name the same repository. */
const refKey = (ref: Ref.Ref<Repo.Repo>): string => {
  const eid = EID.tryParse(ref.uri);
  return (eid && EID.getEntityId(eid)) ?? ref.uri;
};

const handler: Operation.WithHandler<typeof ClaudeAgentOperation.UpdateProjectRepositories> =
  ClaudeAgentOperation.UpdateProjectRepositories.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ project: projectRef, add = [], remove = [] }) {
        const project = yield* Database.load(projectRef);
        const current = Repo.getRepositories(project);
        const removed = new Set(remove.map(refKey));
        const kept = current.filter((ref) => !removed.has(refKey(ref)));
        const next = [...kept];
        for (const ref of add) {
          if (!removed.has(refKey(ref)) && !next.some((listed) => refKey(listed) === refKey(ref))) {
            next.push(ref);
          }
        }
        if (next.length !== current.length || next.some((ref, index) => refKey(ref) !== refKey(current[index]))) {
          Repo.setRepositories(project, next);
          yield* Database.flush();
        }
        return { repositories: [...Repo.getRepositories(project)] };
      }),
    ),
  );

export default handler;
