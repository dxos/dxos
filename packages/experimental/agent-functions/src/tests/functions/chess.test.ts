//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { Chess } from 'chess.js';
import { join } from 'path';

import { FunctionsPlugin } from '@dxos/agent';
import { Trigger } from '@dxos/async';
import { GameType } from '@dxos/chess-app/types';
import { Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { getAutomergeObjectCore } from '@dxos/echo-db';
import { create } from '@dxos/echo-schema';
import { DevServer, type FunctionManifest, FunctionRegistry, Scheduler, TriggerRegistry } from '@dxos/functions';
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
    await client.halo.createIdentity();
    await client.spaces.isReady.wait();
    afterTest(() => client.destroy());

    const functionsPlugin = new FunctionsPlugin();
    await functionsPlugin.initialize({ client, clientServices: services });
    await openAndClose(functionsPlugin);

    const functionRegistry = new FunctionRegistry(client);
    const server = new DevServer(client, functionRegistry, {
      baseDir: join(__dirname, '../../functions'),
    });

    const triggerRegistry = new TriggerRegistry(client);
    const scheduler = new Scheduler(functionRegistry, triggerRegistry, {
      endpoint: `http://localhost:${FUNCTIONS_PORT}/dev`,
    });

    await server.start();
    await scheduler.start();
    afterTest(async () => {
      await scheduler?.stop();
      await server?.stop();
    });

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
            type: 'subscription',
            filter: [
              {
                type: 'dxos.org/type/Chess',
              },
            ],
          },
        },
      ],
    };

    // Create data.
    client.addSchema(GameType);
    const space = client.spaces.default;
    const game = space.db.add(create(GameType, {}));
    await client.spaces.default.db.flush();

    // Create trigger.
    await triggerRegistry.register(space, manifest);

    // Trigger.
    const done = new Trigger();
    const cleanup = getAutomergeObjectCore(game).updates.on(async () => {
      await doMove(game, 'b');
      done.wake();
    });
    afterTest(cleanup);

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
