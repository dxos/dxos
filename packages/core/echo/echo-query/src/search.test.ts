//
// Copyright 2023 DXOS.org
//

import { create, insert, search } from '@orama/orama';
import { describe, expect, test } from 'vitest';

import { createTestObjectGenerator } from '@dxos/echo-generator';
import { faker } from '@dxos/random';
import { range } from '@dxos/util';

faker.seed(1);

// TODO(burdon): Factor out functions.
// TODO(burdon): Chat/search/suggest.
// TODO(burdon): Integrate with schema.
// TODO(burdon): Factor out agent/plugin-search.
// TODO(burdon): Proto defs.
// TODO(burdon): Client/server cascading calls?
// TODO(burdon): SDK/API.

describe('Orama', () => {
  test('basic', async () => {
    // TODO(burdon): Create Client/spaces.
    const generator = createTestObjectGenerator();

    // https://www.npmjs.com/package/@orama/orama
    const db = await create({
      schema: {
        // TODO(burdon): Index TypedObject using schema; separate db for each schema?
        title: 'string',
        embedding: 'vector[1536]', // Vector size must be expressed during schema initialization.
        meta: {
          rating: 'number',
        },
      },
    });

    {
      const objects = await Promise.all(range(10, () => generator.createObject()));
      await Promise.all(objects.map((object) => insert<any>(db, object)));
    }

    {
      const result = await search(db, { term: 'shoes' });
      expect(result.hits).to.have.length;
    }
  });
});
