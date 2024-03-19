//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import { create } from '@orama/orama';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

describe('Schema indexing through orama', () => {
  test('test', async () => {
    const Contact = S.struct({
      name: S.string,
      age: S.optional(S.number),
      address: S.optional(
        S.struct({
          street: S.optional(S.string),
          city: S.string,
        }),
      ),
    });
    expect(Contact).to.exist;

    type Contact = S.Schema.Type<typeof Contact>;

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
    expect(db).to.exist;
  });
});
