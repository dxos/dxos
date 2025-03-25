import { Schema as S } from 'effect';
import { describe, test } from 'vitest';
import { getLabel, LabelAnnotationId } from './annotations';

// TODO(dmaretskyi): Use one of the testing schemas.
const TestObject = S.Struct({
  name: S.optional(S.String),
  fallbackName: S.optional(S.String),
  other: S.String,
}).annotations({
  [LabelAnnotationId]: ['name', 'fallbackName'],
});
type TestObject = S.Schema.Type<typeof TestObject>;

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
  });
});
