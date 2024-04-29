//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';

import { next as A } from '@dxos/automerge/automerge';
import { describe, test } from '@dxos/test';

import { chessMove, type GameType } from './chess';
import { deserializeObjects, type EchoObject, execFunction, type Input, type Output, serializeObjects } from '../exec';

const WORKER_ENDPOINT = 'https://labs-workers.dxos.workers.dev';

const map = execFunction(chessMove());

const post = async (input: Input) => {
  const result = await fetch(`${WORKER_ENDPOINT}/chess/move`, {
    method: 'POST',
    body: JSON.stringify(input),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  expect(result.status).to.equal(200);
  return await result.json<Output>();
};

describe('Chess', () => {
  const testObjects: EchoObject<GameType>[] = [
    {
      id: 'game-1',
      schema: 'example.com/type/Chess',
      object: A.change<GameType>(A.init<GameType>(), (game) => {
        game.fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
      }),
    },
  ];

  test('call function', async () => {
    const input: Input = {
      objects: serializeObjects(testObjects),
    };

    const output = await map(input);
    expect(input.objects?.length).to.eq(output.objects?.length);

    const objects = deserializeObjects(output.objects ?? []);
    expect(objects?.[0].object.fen).to.exist;
  });

  test('call worker', async () => {
    const input: Input = {
      objects: serializeObjects(testObjects),
    };

    const output = await post(input);
    expect(input.objects?.length).to.eq(output.objects?.length);

    const objects = deserializeObjects(output.objects ?? []);
    expect(objects?.[0].object.fen).to.exist;
  });
});
