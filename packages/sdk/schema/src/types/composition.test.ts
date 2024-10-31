import { Schema as S } from '@effect/schema';
import { ColumnSize, DataSource, FieldKind, FieldValueType, type JsonPath } from './types';
import { test } from 'vitest';
import { effectToJsonSchema } from '@dxos/echo-schema';
import { composeSchema } from './composition';
import { log } from '@dxos/log';

test('schema composition', () => {
  const TypeSchema = S.Struct({
    name: S.String,
    email: S.String.pipe(FieldKind(FieldValueType.Email)),
  });

  const ProjectionSchema = S.Struct({
    displayName: S.String.pipe(DataSource('$.name' as JsonPath)).pipe(ColumnSize(50)),
    email: S.String.pipe(DataSource('$.email' as JsonPath)).pipe(ColumnSize(100)),
  });

  const typeSchemaJson = effectToJsonSchema(TypeSchema);
  const projectionSchemaJson = effectToJsonSchema(ProjectionSchema);

  const composedSchema = composeSchema(typeSchemaJson, projectionSchemaJson);

  log.info('composedSchema', { composedSchema });
});
