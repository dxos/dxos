//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Type } from '@dxos/echo';
import { ProjectionModel } from '@dxos/schema';

import { type Table } from '../types';

export const useProjectionModel = <S extends Type.Entity.Any>(schema: S | undefined, table: Table.Table | undefined) =>
  useMemo(() => {
    if (schema && table?.view.target?.projection) {
      const projection = new ProjectionModel(Type.toJsonSchema(schema), table.view.target.projection);
      projection.normalizeView();
      return projection;
    }
  }, [schema, table?.view.target?.projection]);
