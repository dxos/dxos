//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type { Obj, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

/**
 * Every field of the chosen type as a column.
 *
 * The table is built from the ECHO type itself, so adding a field to `schema.ts` adds a column with
 * nothing to configure here.
 */
export const TableView = ({
  type,
  rows,
  onSelect,
}: {
  type: Type.AnyEntity;
  rows: readonly Obj.Unknown[];
  onSelect?: (id: string) => void;
}) => {
  const handleRowClick = useCallback((row: Obj.Unknown) => onSelect?.(row.id), [onSelect]);
  return <DynamicTable type={type} rows={[...rows]} onRowClick={handleRowClick} />;
};
