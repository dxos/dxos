//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import { useContext, useEffect, useMemo, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useManagerOptional, useSelection, useSelectionActions } from '@dxos/react-ui-attention';
import { type ProjectionModel } from '@dxos/schema';

import {
  TableModel,
  type TableModelProps,
  type TableRow,
  type TableRowAction,
  createEchoChangeCallback,
} from '../model';
import { type Table } from '../types';

export type UseTableModelProps<T extends TableRow = TableRow> = {
  object?: Table.Table;
  projection?: ProjectionModel;
  db?: Database.Database;
  rows?: T[];
  rowActions?: TableRowAction[];
  onSelectionChanged?: (selection: string[]) => void;
  onRowAction?: (actionId: string, data: T) => void;
} & Pick<
  TableModelProps<T>,
  'features' | 'onInsertRow' | 'onDeleteRows' | 'onColumnDelete' | 'onCellUpdate' | 'onRowOrderChange'
>;

export const useTableModel = <T extends TableRow = TableRow>({
  object,
  projection,
  db,
  rows,
  rowActions,
  features,
  onSelectionChanged,
  onRowAction,
  ...props
}: UseTableModelProps<T>): TableModel<T> | undefined => {
  const registry = useContext(RegistryContext);
  const viewState = useManagerOptional();
  const selected = useSelection(object && Obj.getURI(object), 'multi');
  const initialSelection = useMemo(() => selected, [object]);

  const [model, setModel] = useState<TableModel<T>>();
  useEffect(() => {
    if (!object || !projection) {
      return;
    }

    let model: TableModel<T> | undefined;
    const t = setTimeout(async () => {
      model = new TableModel<T>({
        registry,
        object,
        projection,
        db,
        viewState,
        change: createEchoChangeCallback<T>(object),
        features,
        rowActions,
        initialSelection,
        onRowAction,
        ...props,
      });
      await model.open();
      setModel(model);
    });

    return () => {
      clearTimeout(t);
      void model?.close();
    };
    // TODO(burdon): Trigger if callbacks change?
  }, [registry, viewState, object, projection, features, rowActions, initialSelection]);

  // Update data when rows change.
  useEffect(() => {
    if (rows && model) {
      model.setRows(rows);
    }
  }, [model, rows]);

  const { multi, clear } = useSelectionActions(model?.id);

  useEffect(() => {
    if (!model) {
      return;
    }

    const unsubscribe = registry.subscribe(model.selection.selectionAtom, () => {
      const selectedItems = [...model.selection.selection];
      multi(selectedItems);
      onSelectionChanged?.(selectedItems);
    });

    // Maybe clear the selection here?
    return () => {
      clear();
      unsubscribe();
    };
  }, [registry, model, onSelectionChanged]);

  return model;
};
