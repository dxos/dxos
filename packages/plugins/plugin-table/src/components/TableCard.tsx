//
// Copyright 2024 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useClient } from '@dxos/react-client';
import { getSpace, useQuery, useSchema } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui-stack';
import {
  Table as TableComponent,
  type TableController,
  type TableFeatures,
  TablePresentation,
  useProjectionModel,
  useTableModel,
} from '@dxos/react-ui-table';
import { type Table } from '@dxos/react-ui-table/types';
import { getTypenameFromQuery } from '@dxos/schema';

export type TableCardProps = {
  role: string;
  object: Table.Table;
};

export const TableCard = ({ role, object }: TableCardProps) => {
  const tableRef = useRef<TableController>(null);

  const client = useClient();
  const space = getSpace(object);
  const typename = object.view.target?.query ? getTypenameFromQuery(object.view.target?.query.ast) : undefined;
  const schema = useSchema(client, space, typename);
  const queriedObjects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: false },
      dataEditable: false,
      schemaEditable: false,
    }),
    [],
  );

  const projection = useProjectionModel(schema, object);
  const model = useTableModel({
    table: object,
    projection,
    features,
    rows: filteredObjects,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
  });

  const presentation = useMemo(() => (model ? new TablePresentation(model) : undefined), [model]);

  return (
    <Card.SurfaceRoot role={role}>
      <TableComponent.Root role={role}>
        <TableComponent.Main
          key={Obj.getDXN(object).toString()}
          ref={tableRef}
          client={client}
          model={model}
          presentation={presentation}
          schema={schema}
        />
      </TableComponent.Root>
    </Card.SurfaceRoot>
  );
};

export default TableCard;
