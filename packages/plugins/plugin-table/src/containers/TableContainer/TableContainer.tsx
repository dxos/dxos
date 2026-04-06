//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import * as Match from 'effect/Match';
import React, { forwardRef, useCallback, useContext, useMemo, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { type Database, Filter, Obj, Order, Query, type QueryAST, Type } from '@dxos/echo';

import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { useObject, useQuery, useSchema } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import {
  Table as TableComponent,
  type TableController,
  type TableFeatures,
  type TableModelProps,
  TablePresentation,
  type TableRowAction,
  extractOrder,
  useAddRow,
  useProjectionModel,
  useTableModel,
} from '@dxos/react-ui-table';
import { getTagFromQuery, getTypenameFromQuery } from '@dxos/schema';

import { meta } from '#meta';
import { type Table } from '#operations';

export type TableContainerProps = ObjectSurfaceProps<Table.Table>;

// TODO(wittjosiah): Need to handle more complex queries by restricting add row.
export const TableContainer = forwardRef<HTMLDivElement, TableContainerProps>(
  ({ role, subject: object, attendableId }, forwardedRef) => {
    const registry = useContext(RegistryContext);
    const { invokePromise } = useOperationInvoker();
    const tableRef = useRef<TableController>(null);

    const db = Obj.getDatabase(object);
    const [view] = useObject(object.view);
    const queryAst = view?.query?.ast;
    const typename = getTypenameFromQuery(queryAst);
    const schema = useSchema(db, typename);
    // TODO(wittjosiah): This should use the full query AST directly.
    //   That currently doesn't work for dynamic schema objects because their indexed typename is the schema object DXN.
    const queriedObjects = useQueryWorkaround(db, queryAst, schema);
    const filteredObjects = useGlobalFilteredObjects(queriedObjects);

    const { graph } = useAppGraph();
    const customActions = useMemo(() => {
      return Atom.make((get) => {
        const actions = get(graph.actions(attendableId!));
        const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
        return {
          nodes,
          edges: nodes.map((node) => ({ source: 'root', target: node.id, relation: 'child' })),
        };
      });
    }, [graph, attendableId]);

    const addRow = useAddRow({ db, schema });

    const handleDeleteRows = useCallback(
      (_row: number, objects: any[]) => {
        void invokePromise(SpaceOperation.RemoveObjects, { objects });
      },
      [invokePromise],
    );

    const handleDeleteColumn = useCallback(
      (fieldId: string) => {
        const liveView = object.view.target;
        invariant(liveView);
        void invokePromise(SpaceOperation.DeleteField, { view: liveView, fieldId });
      },
      [invokePromise, object.view],
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
      (): TableRowAction[] => [{ id: 'open', label: ['open-object.label', { ns: meta.id }] }],
      [],
    );

    const handleRowAction = useCallback(
      (actionId: string, data: any) =>
        Match.value(actionId).pipe(
          Match.when('open', () => invokePromise(LayoutOperation.Open, { subject: [getObjectPathFromObject(data)] })),
          Match.orElseAbsurd,
        ),
      [invokePromise],
    );

    const handleRowOrderChange = useCallback(() => {
      tableRef.current?.update?.();
    }, []);

    const handleCreate = useCallback(
      (schema: Type.AnyEntity, values: any) => {
        invariant(db);
        invariant(Type.isObjectSchema(schema));
        return db.add(Obj.make(schema, values));
      },
      [db],
    );

    const projection = useProjectionModel(schema, object, registry);
    const model = useTableModel({
      object,
      projection,
      features,
      rows: filteredObjects,
      rowActions,
      onInsertRow: addRow,
      onDeleteRows: handleDeleteRows,
      onColumnDelete: handleDeleteColumn,
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

    const presentation = useMemo(() => (model ? new TablePresentation(registry, model) : undefined), [registry, model]);

    const handleRowClick = useCallback(
      (row: any) => {
        if (model?.getDraftRowCount() === 0 && ['frozenRowsEnd', 'fixedEndStart', 'fixedEndEnd'].includes(row?.plane)) {
          handleInsertRow();
        }
      },
      [model],
    );

    return (
      <TableComponent.Root ref={tableRef}>
        <Panel.Root role={role} ref={forwardedRef}>
          <Panel.Toolbar asChild>
            <TableComponent.Toolbar
              attendableId={attendableId}
              customActions={customActions}
              viewDirty={model?.getViewDirty()}
              onAdd={handleInsertRow}
              onSave={handleSave}
            />
          </Panel.Toolbar>
          <Panel.Content asChild>
            <TableComponent.Content
              classNames='border-t border-separator'
              key={attendableId}
              model={model}
              presentation={presentation}
              schema={schema}
              onCreate={handleCreate}
              onRowClick={handleRowClick}
            />
          </Panel.Content>
        </Panel.Root>
      </TableComponent.Root>
    );
  },
);

TableContainer.displayName = 'TableContainer';

export default TableContainer;

const useQueryWorkaround = (
  db: Database.Database | undefined,
  ast: QueryAST.Query | undefined,
  schema: Type.AnyEntity | undefined,
) => {
  // Extract order and tag filter from query AST and apply them to the base filter query.
  const query = useMemo(() => {
    const baseFilter = schema ? Filter.type(schema) : Filter.nothing();
    let query = Query.select(baseFilter);

    // Apply tag filter from the query AST.
    const tag = getTagFromQuery(ast);
    if (tag) {
      query = query.select(Filter.tag(tag));
    }

    if (!ast) {
      return query;
    }

    // Apply sort order from the query AST.
    const orders = extractOrder(ast);
    if (orders && orders.length > 0) {
      const orderObjects = orders
        .filter((order): order is QueryAST.Order & { kind: 'property' } => order.kind === 'property')
        .map((order) => Order.property<any>(order.property, order.direction));

      if (orderObjects.length > 0) {
        return query.orderBy(...(orderObjects as [Order.Any, ...Order.Any[]]));
      }
    }

    return query;
  }, [ast, schema]);

  return useQuery(db, query);
};
