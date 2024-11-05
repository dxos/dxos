//
// Copyright 2024 DXOS.org
//

import { useEffect, useState } from 'react';

import { create, S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type EchoReactiveObject, getSpace } from '@dxos/react-client/echo';
import { createView, type ViewProjection } from '@dxos/schema';

import { TableModel, type TableModelProps } from '../model';
import { type TableType } from '../types';

export type UseTableModelParams = {
  table?: TableType;
  projection?: ViewProjection;
  objects?: EchoReactiveObject<any>[];
} & Pick<TableModelProps, 'onAddColumn' | 'onDeleteColumn' | 'onDeleteRow'>;

export const useTableModel = ({
  table,
  projection,
  objects,
  onAddColumn,
  onDeleteColumn,
  onDeleteRow,
}: UseTableModelParams): TableModel | undefined => {
  const space = getSpace(table);

  // TODO(burdon): Move up-stream.
  useEffect(() => {
    if (space && table && !table?.view) {
      const schema = TypedObject({
        typename: 'example.com/type/' + PublicKey.random().truncate(),
        version: '0.1.0',
      })({
        name: S.optional(S.String),
        description: S.optional(S.String),
        quantity: S.optional(S.Number),
      });

      // Register schema.
      const mutable = space.db.schemaRegistry.addSchema(schema);
      table.view = createView({
        typename: mutable.typename,
        jsonSchema: mutable.jsonSchema,
      });

      // Create first row.
      space.db.add(create(mutable, {}));
    }
  }, [space, table]);

  // Create model.
  const [model, setModel] = useState<TableModel>();
  useEffect(() => {
    if (!table || !projection) {
      return;
    }

    let tableModel: TableModel | undefined;
    const t = setTimeout(async () => {
      tableModel = new TableModel({ table, projection, onAddColumn, onDeleteColumn, onDeleteRow });
      await tableModel.open();
      setModel(tableModel);
    });

    return () => {
      clearTimeout(t);
      void tableModel?.close();
    };
  }, [table, projection, onAddColumn, onDeleteColumn, onDeleteRow]);

  // Update data.
  useEffect(() => {
    if (objects) {
      model?.updateData(objects);
    }
  }, [model, objects]);

  return model;
};
