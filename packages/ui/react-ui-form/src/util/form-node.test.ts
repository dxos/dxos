// dxos/packages/ui/react-ui-form/src/util/FormNode.test.ts
//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S } from '@dxos/effect';

import { createFormTree } from './form-node';

describe('FormNode', () => {
  test('creates form tree for simple types', () => {
    const schema = S.Struct({
      name: S.String,
      age: S.Number,
      active: S.Boolean,
    });

    const tree = createFormTree(schema.ast);

    expect(tree).toEqual({
      type: 'record',
      members: [
        { type: 'input', key: 'name', valueType: 'string', meta: {} },
        { type: 'input', key: 'age', valueType: 'number', meta: {} },
        { type: 'input', key: 'active', valueType: 'boolean', meta: {} },
      ],
    });
  });

  test('creates form tree for nested objects', () => {
    const schema = S.Struct({
      name: S.String,
      address: S.Struct({
        street: S.String,
        city: S.String,
      }),
    });

    const tree = createFormTree(schema.ast);

    expect(tree).toEqual({
      type: 'record',
      members: [
        { type: 'input', key: 'name', valueType: 'string', meta: {} },
        {
          type: 'record',
          key: 'address',
          members: [
            { type: 'input', key: 'street', valueType: 'string', meta: {} },
            { type: 'input', key: 'city', valueType: 'string', meta: {} },
          ],
        },
      ],
    });
  });

  test('creates form tree for arrays', () => {
    const schema = S.Struct({
      tags: S.Array(S.String),
    });

    const tree = createFormTree(schema.ast);

    expect(tree).toEqual({
      type: 'record',
      members: [
        {
          type: 'list',
          key: 'tags',
          element: { type: 'input', valueType: 'string', meta: {} },
        },
      ],
    });
  });

  test('creates form tree for literal unions (enums)', () => {
    const schema = S.Struct({
      status: S.Union(S.Literal('draft'), S.Literal('published'), S.Literal('archived')),
    });

    const tree = createFormTree(schema.ast);

    expect(tree).toEqual({
      type: 'record',
      members: [
        {
          type: 'input',
          key: 'status',
          valueType: 'literal',
          meta: { options: ['draft', 'published', 'archived'] },
        },
      ],
    });
  });

  test('creates form tree for discriminated unions', () => {
    const schema = S.Struct({
      unionProperty: S.Union(
        S.Struct({ kind: S.Literal('a'), value: S.String }),
        S.Struct({ kind: S.Literal('b'), count: S.Number }),
      ),
    });

    const tree = createFormTree(schema.ast);

    expect(tree).toEqual({
      type: 'record',
      members: [
        {
          type: 'choice',
          key: 'unionProperty',
          discriminatingKey: 'kind',
          options: new Map([
            [
              'a',
              {
                type: 'record',
                members: [
                  { type: 'input', key: 'kind', valueType: 'literal', meta: {} },
                  { type: 'input', key: 'value', valueType: 'string', meta: {} },
                ],
              },
            ],
            [
              'b',
              {
                type: 'record',
                members: [
                  { type: 'input', key: 'kind', valueType: 'literal', meta: {} },
                  { type: 'input', key: 'count', valueType: 'number', meta: {} },
                ],
              },
            ],
          ]),
        },
      ],
    });
  });
});
