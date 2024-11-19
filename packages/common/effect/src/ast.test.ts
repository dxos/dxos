//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  findAnnotation,
  findNode,
  findProperty,
  getAnnotation,
  getSimpleType,
  isSimpleType,
  visit,
  type JsonPath,
  type JsonProp,
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

  test('findNode', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.optional(S.String),
    }).pipe(S.mutable);

    const prop = findProperty(TestSchema, 'name' as JsonProp);
    invariant(prop);
    const node = findNode(prop, isSimpleType);
    invariant(node);
    const type = getSimpleType(node);
    expect(type).to.eq('string');
  });

  test('findProperty', ({ expect }) => {
    {
      const prop = findProperty(Contact, 'name' as JsonPath);
      expect(prop).to.exist;
    }
    {
      const prop = findProperty(Contact, 'address.zip' as JsonPath);
      invariant(prop);
      expect(getTitle(prop)).to.eq('ZIP code');
    }
    {
      const prop = findProperty(Contact, 'address.location.lat' as JsonPath);
      invariant(prop);
      expect(AST.isNumberKeyword(prop)).to.be.true;
    }
    {
      const prop = findProperty(Contact, 'address.city' as JsonPath);
      expect(prop).not.to.exist;
    }
  });

  test('findAnnotation', ({ expect }) => {
    const Type = S.NonEmptyString.pipe(S.pattern(/^\d{5}$/)).annotations({
      [AST.TitleAnnotationId]: 'original title',
    });
    const Contact = S.Struct({
      p1: Type.annotations({ [AST.TitleAnnotationId]: 'new title' }),
      p2: Type.annotations({ [AST.TitleAnnotationId]: 'new title' }).pipe(S.optional),
      p3: S.optional(Type.annotations({ [AST.TitleAnnotationId]: 'new title' })),
    });

    {
      const prop = findProperty(Contact, 'p3' as JsonPath);
      invariant(prop);
      const value = findAnnotation(prop, AST.TitleAnnotationId);
      expect(value).to.eq('new title');
    }
  });

  test('visit', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.NonEmptyString,
      emails: S.optional(S.mutable(S.Array(S.String))),
      address: S.optional(
        S.Struct({
          zip: S.String,
        }),
      ),
    });

    const props: string[] = [];
    visit(TestSchema.ast, (_, path) => props.push(path.join('.')));
    console.log(JSON.stringify(props, null, 2));
  });
});
