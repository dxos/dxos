//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { Option, pipe } from 'effect';
import { describe, test } from 'vitest';

import { getProperty, getBaseType, isLeafType, visit } from './ast';

const TestPropTypeId = Symbol.for('@example/schema/test');
const TestProp = S.NonEmptyString.pipe(
  S.pattern(/^[a-zA-Z]\w*$/, {
    typeId: TestPropTypeId,
    identifier: 'TestProp',
    title: 'TestProp',
    description: 'Test property name',
  }),
);

describe('AST', () => {
  test('getProperty', ({ expect }) => {
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

  test('validation', ({ expect }) => {
    const validate = S.validateSync(TestProp);
    validate('x');
    validate('x100');
    validate('foo_bar');

    expect(() => validate('')).to.throw();
    expect(() => validate('2foo')).to.throw();
    expect(() => validate(4)).to.throw();
  });

  test('getType', ({ expect }) => {
    const TestSchema = S.Struct({
      p1: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'P-1' })),
      // p2: S.optional(TestProp.annotations({ [AST.TitleAnnotationId]: 'P-2' })),
      p3: S.optional(TestProp).annotations({ [AST.TitleAnnotationId]: 'P-3' }),
    });

    const props = [];
    for (const prop of AST.getPropertySignatures(TestSchema.ast)) {
      const name = prop.name.toString();
      let title = pipe(AST.getAnnotation(AST.TitleAnnotationId)(prop), Option.getOrUndefined);
      const type = getBaseType(prop.type);
      if (!title) {
        title = pipe(AST.getAnnotation(AST.TitleAnnotationId)(type), Option.getOrUndefined);
      }
      props.push({ name, title });
    }

    expect(props).to.deep.eq([
      {
        name: 'p1',
        title: 'P-1',
      },
      // {
      //   name: 'p2',
      //   title: 'P-2',
      // },
      {
        name: 'p3',
        title: 'P-3',
      },
    ]);
  });

  test('visit', ({ expect }) => {
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
