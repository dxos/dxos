//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { ScoreOperation } from '../types';
import { parseLeadSheet } from '../util/lead-sheet';
import { type MutableScore, applyLeadSheetToScore } from '../util/score-leadsheet';

export default ScoreOperation.Write.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ score, text }) {
      const resolved = yield* Database.load(score);
      const beatsPerBar = parseTimeSignature(resolved.timeSignature);
      const document = parseLeadSheet(text, { beatsPerBar });

      Obj.update(resolved, (resolved) => {
        applyLeadSheetToScore(resolved as unknown as MutableScore, document);
      });

      const tracks = document.tracks.length;
      const notes = document.tracks.reduce((sum, entry) => sum + entry.notes.length, 0);
      return { tracks, notes };
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
