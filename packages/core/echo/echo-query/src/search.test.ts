//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { create, insert, search } from '@orama/orama';

import { range, TestObjectGenerator } from '@dxos/echo-generator';
import { describe, test } from '@dxos/test';

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
    const generator = new TestObjectGenerator();

    // https://www.npmjs.com/package/@orama/orama
    const db = await create({
      schema: {
        // TODO(burdon): Index TypedObject using schema; separate db for each schema?
        title: 'string',
        embedding: 'vector[1536]', // Vector size must be expressed during schema initialization
        meta: {
          rating: 'number',
        },
      },
    });

    {
      const objects = range(() => generator.createObject(), 10);
      await Promise.all(objects.map((object) => insert<any>(db, object)));
    }

    {
      const result = await search(db, { term: 'shoes' });
      console.log(result);
    }
  });
});
