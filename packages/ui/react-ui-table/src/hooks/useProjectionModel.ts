//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import { useState } from 'react';

import { Type } from '@dxos/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ProjectionModel, createDirectChangeCallback, createEchoChangeCallback } from '@dxos/schema';

import { type Table } from '../types';

export const useProjectionModel = <S extends Type.Entity.Any>(
  schema: S | undefined,
  table: Table.Table | undefined,
  registry: Registry.Registry,
) => {
  const [projection, setProjection] = useState<ProjectionModel | undefined>();

  useAsyncEffect(async () => {
    if (schema && table) {
      const view = await table.view.load();
      // For mutable schemas (EchoSchema), use the live jsonSchema reference for reactivity.
      // For immutable schemas, create a snapshot.
      const jsonSchema = Type.isMutable(schema) ? schema.jsonSchema : Type.toJsonSchema(schema);

      // Use createEchoChangeCallback for mutable schemas (EchoSchema), otherwise use direct mutation.
      const change = Type.isMutable(schema)
        ? createEchoChangeCallback(view, schema)
        : createDirectChangeCallback(view.projection, jsonSchema);

      const projection = new ProjectionModel({ registry, view, baseSchema: jsonSchema, change });
      projection.normalizeView();
      setProjection(projection);
    }
  }, [schema, table, registry]);

  return projection;
};
