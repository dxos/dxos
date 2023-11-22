//
// Copyright 2023 DXOS.org
//

import { describe, test } from '@dxos/test';

import handler from './chess';
import { TestBuilder } from '../testing';

describe.skip('Prompts', () => {
  const builder = new TestBuilder();
  beforeEach(() => builder.init());

  test('chess', async () => {
    const messages = handler({ message: 'Suggest the next move.', context: { pgn: '1. e4 e5' } });
    const result = await builder.model.predictMessages(messages!);
    console.log(result.content);
  });
});
