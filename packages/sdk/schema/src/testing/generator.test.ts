//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { createMutableSchema, type ReactiveObject } from '@dxos/echo-schema';

import { Org } from './generator';
import { createView, type ViewType } from '../view';

// TODO(burdon): Generate relational tables/views.
// TODO(burdon): Generate test documents, sketches, sheets.

describe('Generator', () => {
  test('types', ({ expect }) => {
    const schema = createMutableSchema({ typename: 'example.com/type/Org', version: '0.1.0' }, Org.fields);
    const view: ReactiveObject<ViewType> = createView({
      name: 'Test',
      typename: schema.typename,
      jsonSchema: schema.jsonSchema,
    });

    expect(view).to.exist;
  });
});
