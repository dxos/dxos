//
// Copyright 2024 DXOS.org
//

import { Schema as S } from '@effect/schema';
import { describe, expect, test } from 'vitest';

import { getProperty, isLeafType, visit } from './ast';

describe('AST', () => {
  test('getProperty', () => {
    const TestSchema = S.Struct({
      name: S.String,
      address: S.Struct({
        zip: S.String,
      }),
    });

    {
      const prop = getProperty(TestSchema, 'name');
      expect(prop).to.exist;
    }
    {
      const prop = getProperty(TestSchema, 'address.zip');
      expect(prop).to.exist;
    }
    {
      const prop = getProperty(TestSchema, 'address.city');
      expect(prop).not.to.exist;
    }
  });

  test('visit', () => {
    const TestSchema = S.Struct({
      name: S.optional(S.String),
      emails: S.mutable(S.Array(S.String)),
      address: S.optional(
        S.Struct({
          zip: S.String,
        }),
      ),
    });

    const props: string[] = [];
    visit(TestSchema.ast, (node, path) => {
      if (isLeafType(node)) {
        props.push(path.join('.'));
      }
    });
    expect(props).to.deep.eq(['name', 'address.zip']);
  });
});
