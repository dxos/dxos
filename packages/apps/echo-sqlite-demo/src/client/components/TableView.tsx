//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Format, Obj, Ref, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

/**
 * Every field of the chosen type as a column.
 *
 * Columns are derived from the objects rather than declared: a `Ref` shows its target's label, a
 * list joins, everything else prints. The table renders a ref as text here because a ref column
 * needs a view projection that says which property of the target to show, which `DynamicTable`
 * builds only for a schema it owns.
 */
export const TableView = ({
  type,
  rows,
  onSelect,
}: {
  type: Type.AnyObj;
  rows: readonly Obj.Unknown[];
  onSelect?: (id: string) => void;
}) => {
  const properties = useMemo(
    () =>
      [...new Set(rows.flatMap((row) => Object.keys(row)))]
        .filter((name) => name !== 'id')
        .map((name) => ({ name, format: Format.TypeFormat.String })),
    [rows],
  );

  // A ref prints its target's label, in a list as much as on its own — `String(ref)` is `Ref([object Object])`.
  const text = useCallback(
    (value: unknown): unknown => (Ref.isRef(value) ? ((value.target && Obj.getLabel(value.target)) ?? '') : value),
    [],
  );

  const data = useMemo(
    () =>
      rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map(text).join(', ') : text(value),
          ]),
        ),
      ),
    [rows, text],
  );

  const handleRowClick = useCallback((row: { id: string }) => onSelect?.(row.id), [onSelect]);

  return (
    <DynamicTable name={Type.getTypename(type)!} properties={properties} rows={data} onRowClick={handleRowClick} />
  );
};
