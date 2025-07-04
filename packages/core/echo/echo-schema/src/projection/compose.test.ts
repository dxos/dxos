//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { describe, test } from 'vitest';

import { composeSchema } from './compose';
import { FieldPath } from '../ast';
import { FormatAnnotation, FormatEnum } from '../formats';
import { toJsonSchema } from '../json';
import { ECHO_ANNOTATIONS_NS_KEY } from '../json-schema';
import { TypedObject } from '../object';

describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    class BaseType extends TypedObject({ typename: 'example.com/Person', version: '0.1.0' })({
      name: Schema.String,
      email: Schema.String,
    }) {}

    const OverlaySchema = Schema.Struct({
      email: Schema.String.pipe(FieldPath('$.email'), FormatAnnotation.set(FormatEnum.Email)),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema, overlaySchema);
    expect(composedSchema.properties).to.deep.eq({
      email: {
        type: 'string',
        format: FormatEnum.Email,
        // TODO(dmaretskyi): Should use the new field.
        [ECHO_ANNOTATIONS_NS_KEY]: {
          meta: {
            path: '$.email',
          },
        },
      },
    });
  });
});
