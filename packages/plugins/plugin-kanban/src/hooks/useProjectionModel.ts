//
// Copyright 2025 DXOS.org
//

import { type Registry } from '@effect-atom/atom-react';
import { useState } from 'react';

import { Type } from '@dxos/echo';
import { useAsyncEffect } from '@dxos/react-ui';
import { ProjectionModel, createEchoChangeCallback } from '@dxos/schema';

import { type Kanban } from '../types';
import { log } from '@dxos/log';

/**
 * Loads the kanban view and builds a ProjectionModel for field projections and pivot.
 *
 * @template S - Entity schema type.
 * @param schema - Echo schema for the viewed type (or undefined).
 * @param kanban - Kanban object whose view to load (or undefined).
 * @param registry - Atom registry for reactive state.
 * @returns ProjectionModel when loaded, or undefined while loading or when schema/kanban are missing.
 */
export const useProjectionModel = <S extends Type.Entity.Any>(
  schema: S | undefined,
  kanban: Kanban.Kanban | undefined,
  registry: Registry.Registry,
) => {
  const [projection, setProjection] = useState<ProjectionModel | undefined>();

  useAsyncEffect(
    async (controller) => {
      if (!schema || !kanban) {
        return;
      }
      try {
        const view = await kanban.view.load();
        if (controller.signal.aborted) {
          return;
        }

        const jsonSchema = Type.isMutable(schema) ? schema.jsonSchema : Type.toJsonSchema(schema);
        const change = createEchoChangeCallback(view, Type.isMutable(schema) ? schema : undefined);

        const projection = new ProjectionModel({ registry, view, baseSchema: jsonSchema, change });
        projection.normalizeView();
        if (!controller.signal.aborted) {
          setProjection(projection);
        }
      } catch (err) {
        log.catch(err, { schema, kanban });
      }
    },
    [schema, kanban, registry],
  );

  return projection;
};
