//
// Copyright 2023 DXOS.org
//

import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { join } from 'path';

import { FunctionsPlugin } from '@dxos/agent';
import { Trigger } from '@dxos/async';
import { GameType } from '@dxos/chess-app/types';
import { Client, Config } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import * as E from '@dxos/echo-schema';
import { getAutomergeObjectCore } from '@dxos/echo-schema';
import { DevServer, type FunctionManifest, Scheduler } from '@dxos/functions';
import { afterTest, openAndClose, test } from '@dxos/test';

const FUNCTIONS_PORT = 8757;

describe('Chess', () => {
  test.skip('chess function', async () => {
    const testBuilder = new TestBuilder();
    afterTest(() => testBuilder.destroy());
    const services = testBuilder.createLocal();

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

    const client = new Client({ services, config });
    await client.initialize();
    afterTest(() => client.destroy());

    client.addTypes(types);

    const functionsPlugin = new FunctionsPlugin();
    await functionsPlugin.initialize({
      client,
      clientServices: services,
      plugins: [],
    });
    await openAndClose(functionsPlugin);

    const manifest = load(await readFile(join(__dirname, '../../../functions.yml'), 'utf8')) as FunctionManifest;

    const server = new DevServer(client, {
      directory: join(__dirname, '../../functions'),
      manifest,
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
    const game = client.spaces.default.db.add(E.object(GameType, {}));
    await client.spaces.default.db.flush();

    const { Chess } = await import('chess.js');

    const done = new Trigger();
    const advanceGame = () => {
      const chess = new Chess();
      chess.loadPgn(game.pgn ?? '');
      if (chess.isGameOver() || chess.history().length > 50) {
        done.wake();
      }

      if (chess.turn() === 'w') {
        const moves = chess.moves();
        if (moves.length) {
          const move = moves[Math.floor(Math.random() * moves.length)];
          chess.move(move);
          game.pgn = chess.pgn();
          console.log(`move: ${chess.history().length}\n` + chess.ascii());
        }
      }
    };

    const cleanup = getAutomergeObjectCore(game).updates.on(advanceGame);
    afterTest(cleanup);
    advanceGame();

    await done.wait();
  });
});
