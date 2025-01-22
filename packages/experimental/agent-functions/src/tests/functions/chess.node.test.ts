//
// Copyright 2023 DXOS.org
//

import { Chess } from 'chess.js';
import { join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { TestBuilder } from '@dxos/client/testing';
import { getObjectCore } from '@dxos/echo-db';
import { create } from '@dxos/live-object';
import { FunctionDef, type FunctionManifest, FunctionTrigger, TriggerKind } from '@dxos/functions';
import { startFunctionsHost } from '@dxos/functions/testing';
import { GameType } from '@dxos/plugin-chess/types';

import { initFunctionsPlugin } from '../setup';

describe('Chess', () => {
  test('chess function', async () => {
    const testBuilder = new TestBuilder();
    const functions = await startFunctionsHost(testBuilder, initFunctionsPlugin, {
      baseDir: join(__dirname, '../../functions'),
    });

    onTestFinished(() => testBuilder.destroy());

    const manifest: FunctionManifest = {
      functions: [
        {
          uri: 'dxos.org/function/chess',
          route: 'chess',
          handler: 'chess',
        },
      ],
      triggers: [
        {
          function: 'dxos.org/function/chess',
          spec: {
            type: TriggerKind.Subscription,
            filter: {
              type: 'dxos.org/type/Chess',
            },
          },
        },
      ],
    };

    const space = await functions.client.spaces.create();
    functions.client.addTypes([GameType, FunctionDef, FunctionTrigger]);
    const game = space.db.add(create(GameType, {}));
    await space.db.flush();

    // Create trigger.
    await functions.scheduler.triggers.register(space, manifest);

    // Trigger.
    const done = new Trigger();
    const cleanup = getObjectCore(game).updates.on(async () => {
      await doMove(game, 'b');
      done.wake();
    });
    onTestFinished(cleanup);

    // First move.
    await doMove(game, 'w');
    await done.wait();
    const chess = new Chess();
    chess.loadPgn(game.pgn!);
    expect(chess.moveNumber()).to.eq(2);
  }); // TODO(burdon): Hangs after passing.
});

const doMove = async (game: GameType, turn: string) => {
  // TODO(burdon): Error if import is removed.
  //  Uncaught Error: invariant violation: Recursive call to doc.change
  const { Chess } = await import('chess.js');

  const done = new Trigger();

  const chess = new Chess();
  chess.loadPgn(game.pgn ?? '');
  if (chess.isGameOver() || chess.history().length > 50) {
    done.wake();
  }

  if (chess.turn() === turn) {
    const moves = chess.moves();
    if (moves.length) {
      const move = moves[Math.floor(Math.random() * moves.length)];
      chess.move(move);
      game.pgn = chess.pgn();
      console.log(`Move: ${chess.history().length}\n` + chess.ascii());
    }
  }

  return done.wake();
};
