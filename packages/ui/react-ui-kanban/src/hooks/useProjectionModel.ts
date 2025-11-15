//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Type } from '@dxos/echo';
import { ProjectionModel } from '@dxos/schema';

import { type Kanban } from '../types';

export const useProjectionModel = <S extends Type.Obj.Any>(schema: S | undefined, kanban: Kanban.Kanban | undefined) =>
  useMemo(() => {
    if (schema && kanban?.view.target?.projection) {
      const projection = new ProjectionModel(Type.toJsonSchema(schema), kanban.view.target.projection);
      projection.normalizeView();
      return projection;
    }
  }, [schema, kanban?.view.target?.projection]);
