//
// Copyright 2025 DXOS.org
//

import { test } from 'vitest';

import { S } from '@dxos/effect';

import { PropertyValenceId, getValencePropertyOf } from './getter';
import { create } from '../object';

test('getValencePropertyOf', ({ expect }) => {
  const schema = S.Struct({
    title: S.String.annotations({
      [PropertyValenceId]: 'primary',
    }),
    nested: S.Struct({
      property: S.optional(
        S.String.annotations({
          [PropertyValenceId]: 'secondary',
        }),
      ),
    }),
  });

  const obj = create(schema, { title: 'test', nested: { property: 'test2' } });

  const paths = getValencePropertyOf(obj, 'secondary');
  expect(paths).toEqual('nested.property');
});
