//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import handler from './chess';
import { TestBuildler } from '../testing';

describe('Prompts', () => {
  const builder = new TestBuildler();
  before(() => builder.init());

  test.skip('chess', async () => {
    const messages = handler({ message: 'Suggest the next move.', context: { pgn: '1. e4 e5' } });
    expect(messages).to.have.length.greaterThan(1);
    const result = await builder.model.predictMessages(messages!);
    console.log(result.content);
  });
});
