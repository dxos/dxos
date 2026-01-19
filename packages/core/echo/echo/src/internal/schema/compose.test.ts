//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { FieldPath } from '../annotations';
import { EchoObjectSchema } from '../entities';
import { FormatAnnotation, TypeFormat } from '../formats';
import { ECHO_ANNOTATIONS_NS_KEY, toJsonSchema } from '../json-schema';

import { composeSchema } from './compose';

describe('schema composition', () => {
  test('schema composition', ({ expect }) => {
    const BaseType = Schema.Struct({
      name: Schema.String,
      email: Schema.String,
    }).pipe(EchoObjectSchema({ typename: 'example.com/Person', version: '0.1.0' }));

    const OverlaySchema = Schema.Struct({
      email: Schema.String.pipe(FieldPath('$.email'), FormatAnnotation.set(TypeFormat.Email)),
    });

    const baseSchema = toJsonSchema(BaseType);
    const overlaySchema = toJsonSchema(OverlaySchema);
    const composedSchema = composeSchema(baseSchema, overlaySchema);
    expect(composedSchema.properties).to.deep.eq({
      email: {
        type: 'string',
        format: TypeFormat.Email,
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
