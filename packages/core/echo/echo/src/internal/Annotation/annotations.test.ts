//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { createEchoSchema } from '../../testing';
import * as Type from '../../Type';
import { EntityKind } from '../common/types';
import { EchoObjectSchema } from '../Entity';
import { LabelAnnotation, TypenameSchema, VersionSchema, getLabelWithSchema, getTypeAnnotation } from './annotations';

// TODO(dmaretskyi): Use one of the testing schemas.
const TestObject = Schema.Struct({
  name: Schema.optional(Schema.String),
  fallbackName: Schema.optional(Schema.String),
  other: Schema.String,
}).pipe(LabelAnnotation.set(['name', 'fallbackName']));

type TestObject = Schema.Schema.Type<typeof TestObject>;

const TestEchoSchema = TestObject.pipe(EchoObjectSchema(DXN.make('org.dxos.type.test', '0.1.0')));

type TestEchoSchema = Type.InstanceType<typeof TestEchoSchema>;

describe('annotations', () => {
  describe('Typename', () => {
    test('should validate typename', ({ expect }) => {
      // Valid (reverse-DNS format).
      expect(TypenameSchema.make('org.dxos.type.foo')).to.exist;
      expect(TypenameSchema.make('org.dxos.type.fooBar')).to.exist;
      expect(TypenameSchema.make('org.dxos.type.foobar')).to.exist;

      // Invalid.
      expect(() => TypenameSchema.make('dxn:dxos.org')).to.throw();
      expect(() => TypenameSchema.make('2dxos.org')).to.throw();
      expect(() => TypenameSchema.make('dxos org')).to.throw();
    });

    test('should validate version', ({ expect }) => {
      // Valid.
      expect(VersionSchema.make('0.1.0')).to.exist;

      // Invalid.
      expect(() => VersionSchema.make('0.1.x')).to.throw();
      expect(() => VersionSchema.make('0.1.0-alpha')).to.throw();
    });
  });

  describe('getLabelWithSchema', () => {
    test('should return first available label value', ({ expect }) => {
      const obj: TestObject = {
        name: 'Primary Name',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toEqual('Primary Name');
    });

    test('should fallback to second path if first is undefined', ({ expect }) => {
      const obj: TestObject = {
        name: undefined,
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toEqual('Fallback Name');
    });

    test('should return undefined if no label paths resolve', ({ expect }) => {
      const obj: TestObject = {
        name: undefined,
        fallbackName: undefined,
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toBeUndefined();
    });

    test('should skip empty string and fallback to next path', ({ expect }) => {
      const obj: TestObject = {
        name: '',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toEqual('Fallback Name');
    });

    test('should skip whitespace-only string and fallback to next path', ({ expect }) => {
      const obj: TestObject = {
        name: '   ',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toEqual('Fallback Name');
    });

    test('should return undefined if all paths are empty strings', ({ expect }) => {
      const obj: TestObject = {
        name: '',
        fallbackName: '',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toBeUndefined();
    });

    test('should return undefined if all paths are whitespace-only', ({ expect }) => {
      const obj: TestObject = {
        name: '  ',
        fallbackName: '\t\n',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toBeUndefined();
    });

    test('should preserve original string with leading/trailing whitespace when valid', ({ expect }) => {
      const obj: TestObject = {
        name: '  Valid Name  ',
        fallbackName: 'Fallback Name',
        other: 'Other',
      };

      expect(getLabelWithSchema(TestObject, obj)).toEqual('  Valid Name  ');
    });

    test('should return label from echo object', ({ expect }) => {
      const obj = {
        id: 'test',
        name: 'Primary Name',
        fallbackName: 'Fallback Name',
        other: 'Other',
      } as unknown as TestEchoSchema;

      expect(getLabelWithSchema(TestEchoSchema, obj)).toEqual('Primary Name');
    });
  });

  // `getTypeAnnotation(schema)` must work both when given a raw Effect Schema
  // and when given a `Type.Type` entity (which carries its AST on the hidden
  // `StaticTypeSchemaSlot` instead of `.ast`), plus when given a persisted
  // `Type.Type` entity (which carries only `jsonSchema` and needs lazy
  // rehydration via the registered deserializer). Plugin-space's
  // `userSchemas` filter calls this on every schema the registry returns, so
  // a failure here empties the entire Database subgraph in Composer.
  describe('getTypeAnnotation on Type entities', () => {
    test('returns TypeAnnotation for a static Type.Obj entity (no .ast, has StaticTypeSchemaSlot)', ({ expect }) => {
      // TestEchoSchema is a `Type.Obj` entity produced by `EchoObjectSchema(DXN)`.
      const annotation = getTypeAnnotation(TestEchoSchema as any);
      expect(annotation).toBeDefined();
      expect(annotation?.kind).toBe(EntityKind.Object);
      expect(annotation?.typename).toBe('org.dxos.type.test');
    });

    test('returns TypeAnnotation for a persisted Type.Type entity (no slot, has jsonSchema)', ({ expect }) => {
      // createEchoSchema produces a kind=Type entity rebuilt from jsonSchema,
      // with no StaticTypeSchemaSlot — only `jsonSchema`.
      const persisted = createEchoSchema(TestEchoSchema as any);
      const annotation = getTypeAnnotation(persisted as any);
      expect(annotation).toBeDefined();
      expect(annotation?.typename).toBe('org.dxos.type.test');
    });
  });
});
