//
// Copyright 2020 DXOS.org
//

import { waitForCondition } from '@dxos/async';
import { ChessModel, TYPE_CHESS_GAME } from '@dxos/chess-core';
import { createModelTestBench } from '@dxos/echo-db';

import { createModelAdapter } from './adapter';

const ChessModelAdapter = createModelAdapter<any>(TYPE_CHESS_GAME, ChessModel);

test('can play a chess game', async () => {
  const [player1, player2] = await createModelTestBench({ model: ChessModelAdapter });

  // TODO(marik-d): This should be handleded by ECHO & test framework.
  const waitForReplication = (numMoves: number) => waitForCondition(() =>
    player1.model.model.game.history().length === numMoves &&
    player2.model.model.game.history().length === numMoves
  );

  player1.model.model.appendMessage(ChessModel.createGenesisMessage(
    'My Game',
    player1.testMeta.identityKey!.publicKey,
    player2.testMeta.identityKey!.publicKey
  ));
  await waitForCondition(() => player1.model.model.isInitialized);

  player1.model.model.makeMove({ from: 'e2', to: 'e3' });
  await waitForReplication(1);
  player2.model.model.makeMove({ from: 'a7', to: 'a6' });
  await waitForReplication(2);
  player1.model.model.makeMove({ from: 'd1', to: 'h5' });
  await waitForReplication(3);
  player2.model.model.makeMove({ from: 'a8', to: 'a7' });
  await waitForReplication(4);
  player1.model.model.makeMove({ from: 'f1', to: 'c4' });
  await waitForReplication(5);
  player2.model.model.makeMove({ from: 'b7', to: 'b6' });
  await waitForReplication(6);
  player1.model.model.makeMove({ from: 'h5', to: 'f7' });
  await waitForReplication(7);

  for (const peer of [player1, player2]) {
    expect(peer.model.model.game.turn()).toEqual('b');
    expect(peer.model.model.game.in_checkmate()).toEqual(true);
    expect(peer.model.model.game.game_over()).toEqual(true);
  }
});
