//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { EchoObjectSchema } from '../entities';

import { LabelAnnotation, SchemaVersion, Typename, getLabel } from './annotations';

// TODO(dmaretskyi): Use one of the testing schemas.
const TestObject = Schema.Struct({
  name: Schema.optional(Schema.String),
  fallbackName: Schema.optional(Schema.String),
  other: Schema.String,
}).pipe(LabelAnnotation.set(['name', 'fallbackName']));

type TestObject = Schema.Schema.Type<typeof TestObject>;

const TestEchoSchema = TestObject.pipe(
  EchoObjectSchema({
    typename: 'dxos.org/type/Test',
    version: '0.1.0',
  }),
);

type TestEchoSchema = Schema.Schema.Type<typeof TestEchoSchema>;

describe('annotations', () => {
  describe('Typename', () => {
    test('should validate typename', ({ expect }) => {
      // Valid.
      expect(Typename.make('dxos.org/type/foo')).to.exist;
      expect(Typename.make('dxos.org/type/foo-bar')).to.exist;
      expect(Typename.make('dxos.org/type/foo_bar')).to.exist;

      // Invalid.
      expect(() => Typename.make('dxn:dxos.org')).to.throw();
      expect(() => Typename.make('2dxos.org')).to.throw();
      expect(() => Typename.make('dxos org')).to.throw();
    });

    test('should validate version', ({ expect }) => {
      // Valid.
      expect(SchemaVersion.make('0.1.0')).to.exist;

      // Invalid.
      expect(() => SchemaVersion.make('0.1.x')).to.throw();
      expect(() => SchemaVersion.make('0.1.0-alpha')).to.throw();
    });
  });

  describe('getLabel', () => {
    test('should return first available label value', ({ expect }) => {
      const obj: TestObject = {
        name: 'Primary Name',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabel(TestObject, obj)).toEqual('Primary Name');
    });

    test('should fallback to second path if first is undefined', ({ expect }) => {
      const obj: TestObject = {
        name: undefined,
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabel(TestObject, obj)).toEqual('Fallback Name');
    });

    test('should return undefined if no label paths resolve', ({ expect }) => {
      const obj: TestObject = {
        name: undefined,
        fallbackName: undefined,
        other: 'Other',
      };

      expect(getLabel(TestObject, obj)).toBeUndefined();
    });

    test('should return label from echo object', ({ expect }) => {
      const obj: TestEchoSchema = {
        id: 'test',
        name: 'Primary Name',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabel(TestEchoSchema, obj)).toEqual('Primary Name');
    });
  });
});
