//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';

/**
 * Used in forms to identify the field representing an object's type.
 */
export const TypenameAnnotationId = Symbol.for('@dxos/schema/annotation/Typename');

// TODO(wittjosiah): Review these values.
export const TypenameAnnotation = Schema.Literal(
  'object-form',
  'static',
  'limited-static',
  'unused-static',
  'used-static',
  'dynamic',
);

export type TypenameAnnotation = Schema.Schema.Type<typeof TypenameAnnotation>;

// TODO(wittjosiah): This is way to complicated and needs to be simplified.
export const getTypenames = ({
  annotation,
  whitelistedTypenames,
  objectFormTypenames,
  space,
  client,
}: {
  annotation: TypenameAnnotation[];
  whitelistedTypenames: Set<string>;
  objectFormTypenames: Set<string>;
  space?: Space;
  client: Client;
}) => {
  const fixed = client.graph.schemaRegistry.schemas.filter((schema) => {
    const limitedStatic = annotation.includes('limited-static') && whitelistedTypenames.has(Type.getTypename(schema));
    const unusedStatic =
      annotation.includes('unused-static') &&
      whitelistedTypenames.has(Type.getTypename(schema)) &&
      !space?.properties.staticRecords?.includes(Type.getTypename(schema));
    const usedStatic =
      annotation.includes('used-static') &&
      whitelistedTypenames.has(Type.getTypename(schema)) &&
      space?.properties.staticRecords?.includes(Type.getTypename(schema));
    const objectForm = annotation.includes('object-form') && objectFormTypenames.has(Type.getTypename(schema));
    return annotation.includes('static') || limitedStatic || unusedStatic || usedStatic || objectForm;
  });
  const dynamic = space?.db.schemaRegistry.query().runSync() ?? [];
  const typenames = Array.from(
    new Set<string>([
      ...(annotation.includes('limited-static') ||
      annotation.includes('unused-static') ||
      annotation.includes('used-static') ||
      annotation.includes('static') ||
      annotation.includes('object-form')
        ? fixed.map((schema) => Type.getTypename(schema))
        : []),
      ...(annotation.includes('dynamic') ? dynamic.map((schema) => schema.typename) : []),
    ]),
  ).sort();
  return typenames;
};
