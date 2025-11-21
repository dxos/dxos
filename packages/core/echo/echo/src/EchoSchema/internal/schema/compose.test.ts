//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { FieldPath } from '../../ast';
import { FormatAnnotation, FormatEnum } from '../../formats';
import { ECHO_ANNOTATIONS_NS_KEY, toJsonSchema } from '../../json-schema';
import { TypedObject } from '../object';

import { composeSchema } from './compose';

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
