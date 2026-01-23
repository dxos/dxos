//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Type } from '@dxos/echo';
import { ProjectionModel, createDirectChangeCallback, createEchoChangeCallback } from '@dxos/schema';

import { type Table } from '../types';

export const useProjectionModel = <S extends Type.Entity.Any>(schema: S | undefined, table: Table.Table | undefined) =>
  useMemo(() => {
    if (schema && table?.view.target?.projection) {
      const view = table.view.target;
      // For mutable schemas (EchoSchema), use the live jsonSchema reference for reactivity.
      // For immutable schemas, create a snapshot.
      const jsonSchema = Type.isMutable(schema) ? schema.jsonSchema : Type.toJsonSchema(schema);

      // Use createEchoChangeCallback for mutable schemas (EchoSchema), otherwise use direct mutation.
      const change = Type.isMutable(schema)
        ? createEchoChangeCallback(view, schema)
        : createDirectChangeCallback(view.projection, jsonSchema);

      const projection = new ProjectionModel(jsonSchema, view.projection, change);
      projection.normalizeView();
      return projection;
    }
  }, [schema, table?.view.target?.projection]);
