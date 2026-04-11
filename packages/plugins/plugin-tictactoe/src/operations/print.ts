//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Print } from './definitions';

const handler: Operation.WithHandler<typeof Print> = Print.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ board, size }) {
      const rows: string[] = [];
      const separator = '-'.repeat(size * 4 + 1);
      for (let row = 0; row < size; row++) {
        const cells: string[] = [];
        for (let col = 0; col < size; col++) {
          const cell = board[row * size + col];
          cells.push(cell === '-' ? ' ' : cell);
        }
        rows.push('| ' + cells.join(' | ') + ' |');
        if (row < size - 1) {
          rows.push(separator);
        }
      }
      return { ascii: rows.join('\n') };
    }),
  ),
);

export default handler;
