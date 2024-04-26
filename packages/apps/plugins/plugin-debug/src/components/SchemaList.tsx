//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { type FC, useState } from 'react';

import { type Space } from '@dxos/client/echo';
import { Button, DensityProvider } from '@dxos/react-ui';
import { createColumnBuilder, Table, type TableColumnDef } from '@dxos/react-ui-table';

type SchemaRecord = {
  id: string;
  typename: string;
  count?: number;
};

// TODO(dmaretskyi): Convert to the new dynamic schema API.
export const SchemaList: FC<{ space: Space; onCreate?: (schema: any /* Schema */, count: number) => void }> = ({
  space,
  onCreate,
}) => {
  const [schemaCount, setSchemaCount] = useState<Record<string, number>>({});
  const [data, setData] = useState<SchemaRecord[]>([]);
  void space.db.schemaRegistry
    .getAll()
    .then((objects) => {
      setData(
        objects
          .filter((object) => object.typename)
          .map((schema) => ({ id: schema.id, typename: schema.typename, count: schemaCount[schema.id] ?? 1 })),
      );
    })
    .catch();

  const handleUpdateCount = (record: SchemaRecord, _: string, count: number | undefined) => {
    setSchemaCount((schemaCount) => Object.assign({}, schemaCount, { [record.id]: count }));
  };

  const handleCreate = (id: string) => {
    const count = schemaCount[id] ?? 1;
    const schema = data.find((schema) => schema.id === id);
    if (schema) {
      onCreate?.(schema, count);
    }
  };

  const { helper, builder } = createColumnBuilder<SchemaRecord>();
  const columns: TableColumnDef<SchemaRecord>[] = [
    helper.accessor((object) => object.id.slice(0, 8), {
      id: 'id',
      ...builder.string({ size: 120, classNames: 'font-mono' }),
    }),
    helper.accessor('typename', builder.string({ classNames: 'font-mono', meta: { expand: true } })),
    helper.accessor(
      'count',
      builder.number({
        onUpdate: handleUpdateCount,
      }),
    ),
    helper.display({
      id: 'button',
      size: 40,
      cell: ({ row }) => (
        <Button variant={'ghost'} onClick={() => handleCreate(row.original.id)}>
          <Plus />
        </Button>
      ),
    }),
  ];

  return (
    <DensityProvider density={'fine'}>
      <Table<SchemaRecord> columns={columns} data={data} />
    </DensityProvider>
  );
};
