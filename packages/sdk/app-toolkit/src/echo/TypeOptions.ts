//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Filter, Obj, Query, Scope, Type } from '@dxos/echo';
import { type URI } from '@dxos/keys';

export const TypeInputOptions = Schema.Struct({
  location: Schema.Array(Schema.Literals(['database', 'runtime'])),
  kind: Schema.Array(Schema.Literals(['hidden', 'user'])),
});

export type TypeInputOptions = Schema.Schema.Type<typeof TypeInputOptions>;

/**
 * Used in forms to identify the field representing an object's type and determine which types are shown as options.
 */
export const TypeInputOptionsAnnotationId = '@dxos/schema/annotation/TypeInputOptions';
export const TypeInputOptionsAnnotation = Annotation.make({
  id: TypeInputOptionsAnnotationId,
  schema: TypeInputOptions,
  legacyId: true,
});

/**
 * Discovers all types — persisted in the space (database) and code-shipped in the registry (runtime).
 * Persisted schemas are never added to the shared graph registry, so the space scope is required to
 * surface user-defined types.
 */
export const allTypesQuery = Query.select(Filter.type(Type.Type)).from(Scope.space(), Scope.registry());

/**
 * Whether a type is user-facing: an object type (not a relation or meta-schema) that is persisted in a
 * space or carries {@link Annotation.UserType}, unless `includeHidden`. Shared by every surface that
 * lists types or objects so they agree.
 */
export const isUserType = (type: Type.AnyEntity, options?: { includeHidden?: boolean }): boolean => {
  if (Type.isRelation(type) || Type.isTypeKind(type)) {
    return false;
  }
  return (
    options?.includeHidden === true ||
    Type.getDatabase(type) != null ||
    Option.isSome(Annotation.UserType.get(Type.getSchema(type)))
  );
};

/**
 * Whether the object's type is user-facing. An object whose type is not registered reads as user-facing:
 * a persisted type can still be loading, and refusing its objects would fail a drop mid-drag.
 */
export const isUserObject = (object: Obj.Unknown): boolean => {
  const type = Obj.getType(object);
  return type === undefined || isUserType(type);
};

/**
 * Whether the type's {@link Annotation.UserType} carries the tag. Only annotations carry tags, so a type
 * persisted in a space without one has none even though it is user-facing.
 */
export const hasUserTypeTag = (type: Type.AnyEntity, tag: string): boolean =>
  Annotation.UserType.get(Type.getSchema(type)).pipe(Option.exists(({ tags }) => tags?.includes(tag) === true));

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

    if (!isUserType(type)) {
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
    // Only database (user-defined) types carry a user-set `name`; surface it as the label. Static
    // (runtime) types have no data label — leave it undefined so the consumer resolves the proper,
    // localized label from translations keyed by typename (`t('typename.label', { ns: typename })`).
    result.push({ typeUri, typename, label: isDatabase ? Type.getLabel(type) : undefined });
  }

  return result.sort((a, b) => a.typename.localeCompare(b.typename));
};
