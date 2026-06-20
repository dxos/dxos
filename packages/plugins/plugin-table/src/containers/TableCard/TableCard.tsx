//
// Copyright 2024 DXOS.org
//

import { RegistryContext } from '@effect-atom/atom-react';
import React, { useContext, useMemo, useRef } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Obj } from '@dxos/echo';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { useQuery, useType } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';
import {
  Table as TableComponent,
  type TableController,
  type TableFeatures,
  TablePresentation,
  useProjectionModel,
  useTableModel,
} from '@dxos/react-ui-table';
import { type Table } from '@dxos/react-ui-table/types';
import { getTypeURIFromQuery } from '@dxos/schema';

export type TableCardProps = AppSurface.ObjectCardProps<Table.Table>;

export const TableCard = ({ role, subject: object }: TableCardProps) => {
  const registry = useContext(RegistryContext);
  const tableRef = useRef<TableController>(null);

  const db = Obj.getDatabase(object);
  const typeUri = object.view.target?.query ? getTypeURIFromQuery(object.view.target?.query.ast) : undefined;
  const schema = useType(db, typeUri);
  const queriedObjects = useQuery(db, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(queriedObjects);

  const features: Partial<TableFeatures> = useMemo(
    () => ({
      selection: { enabled: false },
      dataEditable: false,
      schemaEditable: false,
    }),
    [],
  );

  const projection = useProjectionModel(schema, object, registry);
  const model = useTableModel({
    object,
    projection,
    features,
    rows: filteredObjects,
    onCellUpdate: (cell) => tableRef.current?.update?.(cell),
  });

  const presentation = useMemo(() => (model ? new TablePresentation(registry, model) : undefined), [registry, model]);

  return (
    <Card.Body>
      <Card.Row fullWidth>
        <TableComponent.Root ref={tableRef}>
          <TableComponent.Content
            key={Obj.getURI(object)}
            model={model}
            presentation={presentation}
            schema={schema}
            classNames='scale-75'
          />
        </TableComponent.Root>
      </Card.Row>
    </Card.Body>
  );
};
