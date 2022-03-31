//
// Copyright 2022 DXOS.org
//

import { useState } from 'react';

import { Item, Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useAsyncEffect } from '@dxos/react-async';

import { TableBuilder, useTableBuilder } from '../builders';

type TestTableCallback = (builder: TableBuilder) => Promise<void>;

export const TYPE_TABLE_BASE = 'dxos:type.table.base';
export const TYPE_TABLE_TABLE = 'dxos:type.table.table';

/**
 * Generate test table.
 */
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
