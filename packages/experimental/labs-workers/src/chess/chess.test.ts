//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import { chessTransform, type GameType } from './chess';
import { execFunction, type SerializedObject } from '../exec';

describe('Chess', () => {
  test('function invocation', async () => {
    const objects: SerializedObject[] = [
      {
        id: 'game-1',
        schema: 'example.com/type/Chess',
        changes: A.save(
          A.change<GameType>(A.init<GameType>(), (game) => {
            game.fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
          }),
        ),
      },
    ];

    const mapper = execFunction(chessTransform());
    const output = await mapper({ objects });
    const object = A.load<GameType>(output.objects![0].changes);
    expect(object.fen).to.exist;
  });
});
