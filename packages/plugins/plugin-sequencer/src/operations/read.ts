//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { ScoreOperation } from '../types';
import { formatLeadSheet } from '../util/lead-sheet';
import { scoreToLeadSheet } from '../util/score-leadsheet';

export default ScoreOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ score }) {
      const resolved = yield* Database.load(score);
      const document = scoreToLeadSheet(resolved);
      const beatsPerBar = parseTimeSignature(resolved.timeSignature);
      const text = formatLeadSheet(document, { beatsPerBar });
      return { text };
    }),
  ),
);

const parseTimeSignature = (input: string | undefined): number => {
  if (!input) {
    return 4;
  }
  const match = /^(\d+)\s*\/\s*\d+$/.exec(input.trim());
  const beats = match ? Number(match[1]) : NaN;
  return Number.isFinite(beats) && beats >= 1 ? Math.floor(beats) : 4;
};
