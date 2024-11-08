//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { Option, pipe } from 'effect';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  getPropertyType,
  getBaseType,
  isLeafType,
  visit,
  type JsonPath,
  getAnnotation,
  getFirstAnnotation,
} from './ast';

const ZipCode = S.String.pipe(
  S.pattern(/^\d{5}$/, {
    typeId: Symbol.for('@example/schema/ZipCode'),
    identifier: 'ZipCode',
    title: 'ZIP code',
    description: 'Simple 5 digit zip code',
  }),
);

const LatLng = S.Struct({
  lat: S.Number,
  lng: S.Number,
});

const Contact = S.Struct({
  name: S.String,
  address: S.Struct({
    zip: ZipCode,
    location: S.optional(LatLng),
  }),
});

const getTitle = getAnnotation(AST.TitleAnnotationId);

describe('AST', () => {
  test('validation', ({ expect }) => {
    const validate = S.validateSync(ZipCode);
    validate('11205');

    expect(() => validate(null)).to.throw();
    expect(() => validate(12345)).to.throw();
    expect(() => validate('')).to.throw();
    expect(() => validate('1234')).to.throw();
  });

  test('getProperty', ({ expect }) => {
    {
      const prop = getPropertyType(Contact, 'name' as JsonPath);
      expect(prop).to.exist;
    }
    {
      const prop = getPropertyType(Contact, 'address.zip' as JsonPath);
      invariant(prop);
      expect(getTitle(prop)).to.eq('ZIP code');
    }
    {
      const prop = getPropertyType(Contact, 'address.location.lat' as JsonPath);
      invariant(prop);
      expect(AST.isNumberKeyword(prop)).to.be.true;
    }
    {
      const prop = getPropertyType(Contact, 'address.city' as JsonPath);
      expect(prop).not.to.exist;
    }
  });

  test('getType', ({ expect }) => {
    const TestSchema = S.Struct({
      p1: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'P-1' })),
      p2: S.optional(ZipCode).annotations({ [AST.TitleAnnotationId]: 'P-2' }),
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
      {
        name: 'p2',
        title: 'P-2',
      },
    ]);
  });

  test('getAnnotation', ({ expect }) => {
    const Type = S.NonEmptyString.pipe(S.pattern(/^\d{5}$/)).annotations({ [AST.TitleAnnotationId]: 'original title' });
    const Contact = S.Struct({
      p1: Type.annotations({ [AST.TitleAnnotationId]: 'new title' }),
      p2: Type.annotations({ [AST.TitleAnnotationId]: 'new title' }).pipe(S.optional),
      p3: S.optional(Type.annotations({ [AST.TitleAnnotationId]: 'new title' })),
    });

    {
      const prop = getPropertyType(Contact, 'p3' as JsonPath);
      invariant(prop);
      const value = getFirstAnnotation(prop, AST.TitleAnnotationId);
      expect(value).to.eq('new title');
    }
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
