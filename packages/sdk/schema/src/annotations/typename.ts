//
// Copyright 2025 DXOS.org
//

import * as Match from 'effect/Match';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { EntityKind, SystemAnnotation, getTypeAnnotation } from '@dxos/echo/internal';

/**
 * Used in forms to identify the field representing an object's type.
 */
export const TypenameAnnotationId = Symbol.for('@dxos/schema/annotation/Typename');
// TODO(wittjosiah): Review these values.
export const TypenameAnnotation = Schema.Literal('non-system', 'unused-non-system', 'setup-in-space');
export type TypenameAnnotation = Schema.Schema.Type<typeof TypenameAnnotation>;

// TODO(wittjosiah): This is way to complicated and needs to be simplified.
export const getTypenames = ({
  annotation,
  space,
  client,
}: {
  annotation: TypenameAnnotation;
  space?: Space;
  client: Client;
}) => {
  const fixed = client.graph.schemaRegistry.schemas.filter((schema) => {
    const relation = getTypeAnnotation(schema)?.kind === EntityKind.Relation;
    if (relation) {
      return false;
    }

    const system = SystemAnnotation.get(schema).pipe(Option.getOrElse(() => false));
    if (system) {
      return false;
    }

    const setup = space?.properties.staticRecords?.includes(Type.getTypename(schema));
    return Match.value(annotation).pipe(
      Match.when('non-system', () => true),
      Match.when('unused-non-system', () => !setup),
      Match.when('setup-in-space', () => setup),
      Match.exhaustive,
    );
  });
  const dynamic = space?.db.schemaRegistry.query().runSync() ?? [];
  const typenames = Array.from(
    new Set<string>([
      ...fixed.map((schema) => Type.getTypename(schema)),
      ...(annotation !== 'unused-non-system' ? dynamic.map((schema) => schema.typename) : []),
    ]),
  ).sort();
  return typenames;
};
