//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { FunctionsPlugin } from '@dxos/agent';
import { Trigger } from '@dxos/async';
import { GameType } from '@dxos/chess-app/types';
import { Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { getAutomergeObjectCore } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { DevServer, type FunctionManifest, Scheduler } from '@dxos/functions';
import { afterTest, openAndClose, test } from '@dxos/test';

const FUNCTIONS_PORT = 8757;

describe('Chess', () => {
  test.only('chess function', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());
    const config = new Config({
      runtime: {
        agent: {
          plugins: [
            {
              id: 'dxos.org/agent/plugin/functions',
              config: {
                port: FUNCTIONS_PORT,
              },
            },
          ],
        },
      },
    });

    const services = testBuilder.createLocalClientServices();
    const client = new Client({ config, services });

    await client.initialize();
    afterTest(() => client.destroy());

    const functionsPlugin = new FunctionsPlugin();
    await functionsPlugin.initialize({ client, clientServices: services });
    await openAndClose(functionsPlugin);

    const manifest: FunctionManifest = {
      functions: [
        {
          id: 'dxos.org/function/chess',
          name: 'chess',
          handler: 'chess',
        },
      ],
      triggers: [
        {
          function: 'dxos.org/function/chess',
          subscription: {
            filter: [
              {
                type: 'dxos.experimental.chess.Game',
              },
            ],
          },
        },
      ],
    };

    const server = new DevServer(client, {
      manifest,
      baseDir: join(__dirname, '../../functions'),
    });

    await server.initialize();
    await server.start();
    afterTest(() => server.stop());

    const scheduler = new Scheduler(client, manifest, {
      endpoint: `http://localhost:${FUNCTIONS_PORT}/dev`,
    });
    await scheduler.start();
    afterTest(() => scheduler.stop());

    await client.halo.createIdentity();
    await client.spaces.isReady.wait();

    // Create data.
    client.addSchema(GameType);
    const game = client.spaces.default.db.add(create(GameType, {}));
    await client.spaces.default.db.flush();

    // Trigger.
    const done = new Trigger();
    const cleanup = getAutomergeObjectCore(game).updates.on(async () => {
      await doMove(game, 'b');
      done.wake();
    });

    afterTest(cleanup);

    await doMove(game, 'w');
    await done.wait();
  });
});

const doMove = async (game: GameType, turn: string) => {
  const done = new Trigger();

  const { Chess } = await import('chess.js');
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
      console.log(`move: ${chess.history().length}\n` + chess.ascii());
    }
  }

  return done.wake();
};
