//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';

import { LighthouseOperation } from '#types';

import { appendFindings, queryFindings, toFinding } from './util.ts';

/** The picks not yet kept as a pick (by subject), in report order: the Findings SyncFindings appends. */
export const unkeptPicks = (
  picks: readonly LighthouseOperation.FindingInput[],
  kept: ReadonlyArray<{ iri: string; keptBy: string }>,
): LighthouseOperation.FindingInput[] => {
  const seen = new Set(kept.filter((finding) => finding.keptBy === 'pick').map((finding) => finding.iri));
  return picks.filter((pick) => {
    if (seen.has(pick.iri)) {
      return false;
    }
    seen.add(pick.iri);
    return true;
  });
};

const handler: Operation.WithHandler<typeof LighthouseOperation.SyncFindings> = LighthouseOperation.SyncFindings.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ research: researchRef, picks }) {
      const research = yield* Database.load(researchRef);
      const kept = yield* queryFindings(research);
      const fresh = unkeptPicks(picks, kept).map((pick) => toFinding(pick, 'pick'));
      yield* appendFindings(research, fresh);
      return fresh.length;
    }),
  ),
);

export default handler;
