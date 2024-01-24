//
// Copyright 2023 DXOS.org
//

import { Schema } from '@dxos/echo-schema';
import { describe, test } from '@dxos/test';

import { generator } from './list';
import { getResources } from './testing';

// TODO(burdon): How to prompt for schema formatting?
// TODO(burdon): Create testbench for chains (using llama, function, tools, etc.)

describe.skip('list', () => {
  test('basic', async () => {
    const resources = getResources();

    // TODO(burdon): Convert to zod.
    const schema = new Schema({
      typename: 'example.com/schema/company',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
        },
        {
          id: 'website',
          type: Schema.PropType.STRING,
        },
      ],
    });

    const sequence = generator(resources, () => ({ schema }));
    const result = await sequence.invoke('List the top five fortune-500 companies.');
    console.log(JSON.stringify(JSON.parse(result), undefined, 2));
  });
});
