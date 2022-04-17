//
// Copyright 2022 DXOS.org
//

import { useMemo, useState } from 'react';

import { Item, Party } from '@dxos/client';
import { TableBuilder } from '@dxos/client-testing';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';

type TestTableCallback = (builder: TableBuilder) => Promise<void>;

export const TYPE_TABLE_BASE = 'example:type/table/base';
export const TYPE_TABLE_TABLE = 'example:type/table/table';

/**
 * @param party
 * @param table
 */
export const useTableBuilder = (party?: Party, table?: Item<ObjectModel>) => {
  return useMemo(() => (party && table) ? new TableBuilder(party, table) : undefined, [table?.id]);
};

/**
 * Generate test table.
 */
// TODO(burdon): Remove.
export const useTestTable = (party?: Party, callback: TestTableCallback = buildTestTable): Item<ObjectModel> | undefined => {
  const [table, setTable] = useState<Item<ObjectModel>>();
  const builder = useTableBuilder(party, table);

  useAsyncEffect(async () => {
    if (party) {
      const baseItem = await party.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_BASE
      });

      const tableItem = await party.database.createItem({
        model: ObjectModel,
        type: TYPE_TABLE_TABLE,
        parent: baseItem.id
      });

      setTable(tableItem);
    }
  }, [party]);

  useAsyncEffect(async () => {
    if (builder) {
      await callback(builder);
    }
  }, [builder, party]);

  return table;
};

/**
 * Build the table.
 * @param builder
 */
export const buildTestTable: TestTableCallback = async (builder: TableBuilder) => {
  const columns = await builder.createColumns([5, 7]);
  const fieldIds = columns.map(column => ({ columnId: column.id }));
  await builder.createRows(fieldIds, [30, 40]);
};
