//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

import { deriveState } from '../../types';

const CELL_CHARS: Record<string, string> = { X: 'X', O: 'O', null: '.' };

export default defineFunction({
  key: 'dxos.org/function/tictactoe/print',
  name: 'Print board',
  description: 'Returns an ASCII representation of the current board state.',
  inputSchema: Schema.Struct({
    moves: Schema.Array(Schema.Number).annotations({
      description: 'Ordered cell indices (0–8) of moves played.',
    }),
  }),
  outputSchema: Schema.Struct({
    ascii: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { moves } }) {
    const { cells } = deriveState(moves);
    const row = (start: number) =>
      [cells[start], cells[start + 1], cells[start + 2]].map((c) => CELL_CHARS[String(c)]).join(' | ');
    const ascii = [row(0), '---------', row(3), '---------', row(6)].join('\n');
    return { ascii };
  }),
});
