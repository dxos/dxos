//
// Copyright 2024 DXOS.org
//

import { Schema as S } from 'effect';
import { describe, test } from 'vitest';

import { composeSchema } from './compose';
import { toJsonSchema } from './json-schema';
import { ECHO_ANNOTATIONS_NS_DEPRECATED_KEY, FieldPath } from '../ast';
import { FormatAnnotation, FormatEnum } from '../formats';
import { TypedObject } from '../object';

describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: S.String,
      email: S.String,
    }) {}

    const OverlaySchema = S.Struct({
      email: S.String.pipe(FieldPath('$.email'), FormatAnnotation.set(FormatEnum.Email)),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema, overlaySchema);
    expect(composedSchema.properties).to.deep.eq({
      email: {
        type: 'string',
        format: FormatEnum.Email,
        // TODO(dmaretskyi): Should use the new field.
        [ECHO_ANNOTATIONS_NS_DEPRECATED_KEY]: {
          annotations: {
            path: '$.email',
          },
        },
      },
    });
  });
});
