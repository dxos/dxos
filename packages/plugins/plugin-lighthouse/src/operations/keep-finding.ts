//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { LighthouseOperation, Research } from '#types';

import { appendFindings, loadClient, queryFindings, toFinding } from './util.ts';

const handler: Operation.WithHandler<typeof LighthouseOperation.KeepFinding> = LighthouseOperation.KeepFinding.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ research: researchRef, finding: input, starred }) {
      const { db } = yield* Database.Service;
      const research = yield* Database.load(researchRef);
      const kept = (yield* queryFindings(research)).filter((finding) => finding.iri === input.iri);

      if (!starred) {
        // Unkeeping removes the star, never the entry: the feed is the history of what was kept.
        yield* Effect.promise(() =>
          Promise.all(kept.map((finding) => Research.setStarred(research, finding.id, db, false))),
        );
        return;
      }

      let finding = kept.at(-1);
      if (!finding) {
        // The provenance comes from the graph; a server that cannot answer it keeps the article's copy without one.
        const client = yield* loadClient(research);
        const entity = yield* client.getEntity(input.iri).pipe(Effect.orElseSucceed(() => undefined));
        finding = toFinding(input, 'person', entity);
        yield* appendFindings(research, [finding]);
      }
      const { id } = finding;
      yield* Effect.promise(() => Research.setStarred(research, id, db, true));
    }),
  ),
);

export default handler;
