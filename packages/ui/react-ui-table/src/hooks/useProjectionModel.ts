//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import { useState } from 'react';

import { Type } from '@dxos/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';

import { type Table } from '../types';

export const useProjectionModel = <S extends Type.AnyEntity>(
  schema: S | undefined,
  table: Table.Table | undefined,
  registry: Registry.Registry,
) => {
  const [projection, setProjection] = useState<ProjectionModel | undefined>();

  useAsyncEffect(async () => {
    if (schema && table) {
      const view = await table.view.load();
      // Use the live jsonSchema reference for reactivity.
      const jsonSchema = schema.jsonSchema;

      // Always use createEchoChangeCallback since the view is ECHO-backed.
      // Pass the type entity only when stored, to allow schema mutations.
      const change = createEchoChangeCallback(view, Type.getDatabase(schema) != null ? schema : undefined);

      const projection = new ProjectionModel({ registry, view, baseSchema: jsonSchema, change });
      projection.normalizeView();
      setProjection(projection);
    }
  }, [schema, table, registry]);

  return projection;
};
