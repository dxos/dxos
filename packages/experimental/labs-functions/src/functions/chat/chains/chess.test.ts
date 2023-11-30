//
// Copyright 2023 DXOS.org
//

import { type TypedObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { generator } from './chess';
import { createChainResources } from '../../../chain';
import { type PromptContext } from '../request';

describe('chess', () => {
  test('chess', async () => {
    const resources = createChainResources('ollama');
    const context: PromptContext = {
      object: {
        pgn: '1. e4 e5',
      } as any as TypedObject,
    };

    const sequence = generator(resources, () => context);
    const result = await sequence.invoke('Suggest the next move.');
    console.log(result);
  });
});
