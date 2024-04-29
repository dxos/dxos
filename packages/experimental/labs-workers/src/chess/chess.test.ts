//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import { chessMove, type GameType } from './chess';
import { type EchoObject, execFunction, fromBuffer, type Input, type Output, toBuffer } from '../exec';

describe('Chess', () => {
  test('function invocation', async () => {
    const input: Input = {
      objects: [
        {
          id: 'game-1',
          schema: 'example.com/type/Chess',
          changes: A.save(
            A.change<GameType>(A.init<GameType>(), (game) => {
              game.fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
            }),
          ),
        },
      ],
    };

    const mapper = execFunction(chessMove());
    const output = await mapper(input);
    expect(input.objects?.length).to.eq(output.objects?.length);

    const objects = output.objects?.map<EchoObject<GameType>>(({ id, schema, changes }) => ({
      id,
      schema,
      object: A.load<unknown>(changes),
    }));

    expect(objects?.[0].object.fen).to.exist;
  });

  // TODO(burdon): Create worker test that actually posts to CF.
  test('call worker', async () => {
    const input: Input = {
      objects: [
        {
          id: 'game-1',
          schema: 'example.com/type/Chess',
          changes: toBuffer(
            A.save(
              A.change<GameType>(A.init<GameType>(), (game) => {
                game.fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
              }),
            ),
          ),
        },
      ],
    };

    const result = await fetch('https://labs-workers.dxos.workers.dev/chess/move', {
      method: 'POST',
      body: JSON.stringify(input),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(result.status).to.equal(200);

    const output = await result.json<Output>();
    expect(input.objects?.length).to.eq(output.objects?.length);

    const objects = output.objects?.map<EchoObject<GameType>>(({ id, schema, changes }) => ({
      id,
      schema,
      object: A.load<GameType>(fromBuffer(changes)),
    }));

    expect(objects?.[0].object.fen).to.exist;
  });
});
