import { Schema as S } from 'effect';
import { describe, test } from 'vitest';
import { EchoObject, getLabel, LabelAnnotationId } from './annotations';
import { log } from '@dxos/log';

// TODO(dmaretskyi): Use one of the testing schemas.
const TestObject = S.Struct({
  name: S.optional(S.String),
  fallbackName: S.optional(S.String),
  other: S.String,
}).annotations({
  [LabelAnnotationId]: ['name', 'fallbackName'],
});
type TestObject = S.Schema.Type<typeof TestObject>;

const TestEchoSchema = TestObject.pipe(EchoObject('dxos.org/type/Test', '0.1.0'));
type TestEchoSchema = S.Schema.Type<typeof TestEchoSchema>;
describe('annotations', () => {
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

    test.only('should return label from echo object', ({ expect }) => {
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
