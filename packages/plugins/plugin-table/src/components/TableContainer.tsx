//
// Copyright 2024 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Match from 'effect/Match';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useMemo, useRef } from 'react';

import { LayoutAction, createIntent } from '@dxos/app-framework';
import { useAppGraph, useIntentDispatcher } from '@dxos/app-framework/react';
import { Filter, Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import {
  Table as TableComponent,
  type TableController,
  type TableFeatures,
  type TableModelProps,
  TablePresentation,
  type TableRowAction,
  TableToolbar,
  useAddRow,
  useTableModel,
} from '@dxos/react-ui-table';
import { type Table } from '@dxos/react-ui-table/types';
import { ProjectionModel, getTypenameFromQuery } from '@dxos/schema';

import { meta } from '../meta';

export type TableContainerProps = {
  role: string;
  object: Table.Table;
};

// TODO(wittjosiah): Need to handle more complex queries by restricting add row.
export const TableContainer = ({ role, object }: TableContainerProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const tableRef = useRef<TableController>(null);

  const client = useClient();
  const space = getSpace(object);
  const view = object.view.target;
  const query = view ? Query.fromAst(Obj.getSnapshot(view).query.ast) : Query.select(Filter.nothing());
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;
  const schema = useSchema(client, space, typename);
  const queriedObjects = useQuery(space, query);
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Atom.make((get) => {
      const actions = get(graph.actions(Obj.getDXN(object).toString()));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      return {
        nodes,
        edges: nodes.map((node) => ({ source: 'root', target: node.id })),
      };
    });
  }, [graph]);

  const addRow = useAddRow({ space, schema });

  const handleDeleteRows = useCallback(
    (_row: number, objects: any[]) => {
      void dispatch(createIntent(SpaceAction.RemoveObjects, { objects }));
    },
    [dispatch],
  );

  const handleDeleteColumn = useCallback(
    (fieldId: string) => {
      invariant(view);
      void dispatch(createIntent(SpaceAction.DeleteField, { view, fieldId }));
    },
    [dispatch, view],
  );

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' },
      dataEditable: true,
      schemaEditable: schema && Type.isMutable(schema),
    }),
    [],
  );

  const handleCellUpdate = useCallback<Required<TableModelProps>['onCellUpdate']>((cell) => {
    tableRef.current?.update?.(cell);
  }, []);

  const rowActions = useMemo(
    (): TableRowAction[] => [{ id: 'open', label: ['open record label', { ns: meta.id }] }],
    [],
  );

  const handleRowAction = useCallback(
    (actionId: string, data: any) =>
      Match.value(actionId).pipe(
        Match.when('open', () =>
          dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [Obj.getDXN(data).toString()] })),
        ),
        Match.orElseAbsurd,
      ),
    [dispatch],
  );

  const handleRowOrderChange = useCallback(() => {
    tableRef.current?.update?.();
  }, []);

  const handleCreate = useCallback(
    (schema: Schema.Schema.AnyNoContext, values: any) => {
      invariant(space);
      return space.db.add(Obj.make(schema, values));
    },
    [space],
  );

  const projection = useMemo(() => {
    if (schema && object?.view.target?.projection) {
      const projection = new ProjectionModel(Type.toJsonSchema(schema), object.view.target.projection);
      projection.normalizeView();
      return projection;
    }
  }, [schema, object?.view.target?.projection]);

  const model = useTableModel({
    table: object,
    projection,
    features,
    rows: filteredObjects,
    rowActions,
    onInsertRow: addRow,
    onDeleteRows: handleDeleteRows,
    onDeleteColumn: handleDeleteColumn,
    onCellUpdate: handleCellUpdate,
    onRowAction: handleRowAction,
    onRowOrderChange: handleRowOrderChange,
  });

  const handleInsertRow = useCallback(() => {
    const insertResult = model?.insertRow();
    tableRef.current?.handleInsertRowResult?.(insertResult);
  }, [model, tableRef.current]);

  const handleSave = useCallback(() => {
    model?.saveView();
  }, [model]);

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  const handleRowClick = useCallback(
    (row: any) => {
      if (model?.getDraftRowCount() === 0 && ['frozenRowsEnd', 'fixedEndStart', 'fixedEndEnd'].includes(row?.plane)) {
        handleInsertRow();
      }
    },
    [model],
  );

  return (
    <StackItem.Content toolbar>
      <TableToolbar
        attendableId={Obj.getDXN(object).toString()}
        customActions={customActions}
        onAdd={handleInsertRow}
        onSave={handleSave}
      />
      <TableComponent.Root role={role}>
        <TableComponent.Main
          key={Obj.getDXN(object).toString()}
          ref={tableRef}
          client={client}
          model={model}
          presentation={presentation}
          schema={schema}
          onCreate={handleCreate}
          onRowClick={handleRowClick}
        />
      </TableComponent.Root>
    </StackItem.Content>
  );
};

export default TableContainer;
