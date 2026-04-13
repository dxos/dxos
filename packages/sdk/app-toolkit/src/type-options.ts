//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { EntityKind, SystemTypeAnnotation, createAnnotationHelper, getTypeAnnotation } from '@dxos/echo/internal';

export const TypeInputOptions = Schema.Struct({
  location: Schema.Array(Schema.Literal('database', 'runtime')),
  kind: Schema.Array(Schema.Literal('system', 'user')),
});

export type TypeInputOptions = Schema.Schema.Type<typeof TypeInputOptions>;

/**
 * Used in forms to identify the field representing an object's type and determine which types are shown as options.
 */
export const TypeInputOptionsAnnotationId = Symbol.for('@dxos/schema/annotation/TypeInputOptions');
export const TypeInputOptionsAnnotation = createAnnotationHelper<TypeInputOptions>(TypeInputOptionsAnnotationId);

// TODO(wittjosiah): This is too complicated and needs to be simplified.
export const getTypenames = ({ annotation, space }: { annotation: TypeInputOptions; space?: Space }) => {
  const includeRuntime = annotation.location.includes('runtime');
  const includeDatabase = annotation.location.includes('database');
  const includeSystemType = annotation.kind.includes('system');
  const includeUserType = annotation.kind.includes('user');

  const runtimeTypenames =
    includeRuntime && space
      ? space.db.schemaRegistry
          .query({ location: ['runtime'] })
          .runSync()
          .filter((schema) => {
            const relation = getTypeAnnotation(schema)?.kind === EntityKind.Relation;
            if (relation) {
              return includeSystemType;
            }

            const system = SystemTypeAnnotation.get(schema).pipe(Option.getOrElse(() => false));
            if (system) {
              return includeSystemType;
            }

            return includeUserType;
          })
          .map((schema) => Type.getTypename(schema))
      : [];

  const databaseTypenames =
    includeDatabase && space
      ? space.db.schemaRegistry
          .query({ location: ['database'] })
          .runSync()
          .map((schema) => Type.getTypename(schema))
      : [];

  return Array.from(new Set<string>([...runtimeTypenames, ...databaseTypenames])).sort();
};
