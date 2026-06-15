//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Filter, Query, Scope, Type } from '@dxos/echo';
import { HiddenAnnotation, getTypeAnnotation } from '@dxos/echo/Annotation';
import { Kind as EntityKind } from '@dxos/echo/Entity';
import { createAnnotationHelper } from '@dxos/echo/internal';
import { type URI } from '@dxos/keys';

export const TypeInputOptions = Schema.Struct({
  location: Schema.Array(Schema.Literal('database', 'runtime')),
  kind: Schema.Array(Schema.Literal('hidden', 'user')),
});

export type TypeInputOptions = Schema.Schema.Type<typeof TypeInputOptions>;

/**
 * Used in forms to identify the field representing an object's type and determine which types are shown as options.
 */
export const TypeInputOptionsAnnotationId = Symbol.for('@dxos/schema/annotation/TypeInputOptions');
export const TypeInputOptionsAnnotation = createAnnotationHelper<TypeInputOptions>(TypeInputOptionsAnnotationId);

/**
 * Discovers all types — persisted in the space (database) and code-shipped in the registry (runtime).
 * Persisted schemas are never added to the shared graph registry, so the space scope is required to
 * surface user-defined types.
 */
export const allTypesQuery = Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry());

export type TypeOption = {
  /** Full type URI (DXN or EID), suitable for use with Filter.type. */
  typeUri: URI.URI;
  /** Bare typename string, used as i18n namespace key. */
  typename: string;
  /** Human-readable label derived from the entity's LabelAnnotation fields (e.g. `name` on persisted schemas). */
  label?: string;
};

/**
 * Filters discovered types by location and kind, deduplicates by typename, and returns stable options sorted by typename.
 */
export const filterTypeOptions = (types: readonly Type.AnyEntity[], annotation: TypeInputOptions): TypeOption[] => {
  const includeRuntime = annotation.location.includes('runtime');
  const includeDatabase = annotation.location.includes('database');
  const includeHiddenType = annotation.kind.includes('hidden');
  const includeUserType = annotation.kind.includes('user');

  const seen = new Set<string>();
  const result: TypeOption[] = [];

  for (const type of types) {
    if (!Type.isType(type)) {
      continue;
    }

    // A schema attached to a database is persisted (user-defined); one without a database is code-shipped (runtime).
    const isDatabase = Type.getDatabase(type) != null;
    if (isDatabase ? !includeDatabase : !includeRuntime) {
      continue;
    }

    const effectSchema = Type.getSchema(type);
    const relation = getTypeAnnotation(effectSchema)?.kind === EntityKind.Relation;
    const hidden = HiddenAnnotation.get(effectSchema).pipe(Option.getOrElse(() => false));
    if (relation || hidden) {
      if (!includeHiddenType) {
        continue;
      }
    } else if (!includeUserType) {
      continue;
    }

    const typeUri = Type.getURI(type);
    if (seen.has(typeUri)) {
      continue;
    }
    seen.add(typeUri);

    const typename = Type.getTypename(type);
    result.push({ typeUri, typename, label: Type.getLabel(type) });
  }

  return result.sort((a, b) => a.typename.localeCompare(b.typename));
};
