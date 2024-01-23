//
// Copyright 2023 DXOS.org
//

import { type TypedObject } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { generator } from './chess';
import { getResources } from './testing';
import { type RequestContext } from '../context';

describe.skip('chess', () => {
  test('basic', async () => {
    const resources = getResources();
    const context: RequestContext = {
      object: {
        pgn: '1. e4 e5',
      } as any as TypedObject,
    };

    const sequence = generator(resources, () => context);
    const result = await sequence.invoke('Suggest the next move.');
    console.log(result);
  });
});
