import { FunctionsPlugin } from '@dxos/agent';
import { Trigger } from '@dxos/async';
import { Game, types } from '@dxos/chess-app/proto';
import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { subscribe } from '@dxos/echo-schema';
import { DevServer, FunctionsManifest, TriggerManager } from '@dxos/functions';
import { afterTest, openAndClose, test } from '@dxos/test';
import { readFile } from 'fs/promises';
import { load } from 'js-yaml';
import { join } from 'path';

const HUB_PORT = 8757;

test.only('chess function', async () => {
  const testBuilder = new TestBuilder();
  afterTest(() => testBuilder.destroy());
  const services = testBuilder.createLocal();
  const client = new Client({ services });
  await client.initialize();
  afterTest(() => client.destroy());

  client.addTypes(types)

  const functionsPlugin = new FunctionsPlugin({
    port: HUB_PORT,
  });
  await functionsPlugin.initialize({
    client,
    clientServices: services,
    plugins: [],
  });
  await openAndClose(functionsPlugin);

  const functionsManifest = load(
    await readFile(join(__dirname, '../../../functions.yml'), 'utf8'),
  ) as FunctionsManifest;
  const devServer = new DevServer(client, {
    directory: join(__dirname, '../../functions'),
    manifest: functionsManifest,
  });
  await devServer.initialize();
  await devServer.start();
  afterTest(() => devServer.stop());

  const endpoint = `http://localhost:${HUB_PORT}`;
  const triggers = new TriggerManager(client, functionsManifest.triggers, { runtime: 'dev', endpoint });
  await triggers.start();
  afterTest(() => triggers.stop());

  await client.halo.createIdentity();  
  await client.spaces.isReady.wait();
  const game = client.spaces.default.db.add(new Game())
  await client.spaces.default.db.flush();
  
  const { Chess } = await import('chess.js');

  const advanceGame = () => {
    const chess = new Chess();
    chess.loadPgn(game.pgn ?? '');

    if(chess.isGameOver() || chess.history().length > 50) {
      over.wake();
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
  }

  const over = new Trigger()
  const cleanup = game[subscribe](advanceGame)
  afterTest(cleanup);
  advanceGame();

  await over.wait();
});
