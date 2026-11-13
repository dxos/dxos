//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Format, Obj, Ref, Type } from '@dxos/echo';
import { DynamicTable } from '@dxos/react-ui-table';

/** A ref prints its target's label, and a list joins its items. */
const text = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(text).join(', ');
  }
  if (Ref.isRef(value)) {
    // Every type is queried, so a target is in the working set and a
    // synchronous read finds it.
    const target = value.peek();
    return (target && Obj.getLabel(target)) ?? '';
  }
  return value;
};

export type RecordTableProps = {
  type: Type.AnyObj;
  records: readonly Obj.Unknown[];
  onSelect: (id: string) => void;
};

/** The records of one type, one column per field. */
export const RecordTable = ({ type, records, onSelect }: RecordTableProps) => {
  const properties = useMemo(
    () =>
      [...new Set(records.flatMap((record) => Object.keys(record)))]
        .filter((name) => name !== 'id')
        .map((name) => ({ name, format: Format.TypeFormat.String })),
    [records],
  );

  const rows = useMemo(
    () =>
      records.map((record) =>
        Object.fromEntries(
          Object.entries(record).map(([key, value]) => [key, text(value)]),
        ),
      ),
    [records],
  );

  const handleRowClick = useCallback(
    (row: { id: string }) => onSelect(row.id),
    [onSelect],
  );

  return (
    <DynamicTable
      name={Type.getTypename(type)}
      properties={properties}
      rows={rows}
      onRowClick={handleRowClick}
    />
  );
};
