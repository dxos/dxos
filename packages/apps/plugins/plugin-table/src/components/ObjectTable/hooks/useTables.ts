//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { TableType } from '@braneframe/types';
import { Filter } from '@dxos/echo-schema';
import { type Space, useQuery } from '@dxos/react-client/echo';

export const useTables = (space?: Space) => {
  const tableFilter = useMemo(() => Filter.schema(TableType), []);
  return useQuery<TableType>(space, tableFilter);
};
