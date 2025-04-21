//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { getLabel, EchoObject, LabelAnnotationId, Typename, Version } from './annotations';

// TODO(dmaretskyi): Use one of the testing schemas.
const TestObject = S.Struct({
  name: S.optional(S.String),
  fallbackName: S.optional(S.String),
  other: S.String,
}).annotations({
  [LabelAnnotationId]: ['name', 'fallbackName'],
});

type TestObject = S.Schema.Type<typeof TestObject>;

const TestEchoSchema = TestObject.pipe(EchoObject({ typename: 'dxos.org/type/Test', version: '0.1.0' }));
type TestEchoSchema = S.Schema.Type<typeof TestEchoSchema>;

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
      expect(Version.make('0.1.0')).to.exist;

      // Invalid.
      expect(() => Version.make('0.1.x')).to.throw();
      expect(() => Version.make('0.1.0-alpha')).to.throw();
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
