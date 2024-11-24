//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { TestSchemaType, createSpaceObjectGenerator } from '@dxos/echo-generator';
import { type EchoReactiveObject, type ReactiveObject, type Space } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, Table } from '@dxos/react-ui-table/deprecated';

const BATCH_SIZE = 10;

export type CreateObjectsParams = {
  schema: string;
  enabled: boolean;
  objectsCount: number;
  mutationsCount: number;
  maxContentLength: number;
  mutationSize: number;
};

export type ObjectCreatorProps = {
  space: Space;
  onAddObjects?: (objects: ReactiveObject<any>[]) => void;
};

export const ObjectCreator = ({ space, onAddObjects }: ObjectCreatorProps) => {
  const generator = useMemo(() => createSpaceObjectGenerator(space), [space]);

  const [objects, setObjects] = useState<CreateObjectsParams[]>(
    Object.values(TestSchemaType).map((schema) => ({
      schema,
      enabled: true,
      objectsCount: 10,
      mutationsCount: 10,
      mutationSize: 10,
      maxContentLength: 1000,
    })),
  );

  const handleCreate = async () => {
    for (const params of objects) {
      if (!params.enabled) {
        continue;
      }

      let objectsCreated = 0;
      while (objectsCreated < params.objectsCount) {
        const objects = (await generator.createObjects({
          [params.schema]: Math.min(BATCH_SIZE, params.objectsCount - objectsCreated),
        })) as EchoReactiveObject<any>[];

        await generator.mutateObjects(objects, {
          count: params.mutationsCount,
          mutationSize: params.mutationSize,
          maxContentLength: params.maxContentLength,
        });

        objectsCreated += objects.length;
        onAddObjects?.(objects);
      }
    }

    await space.db.flush();
  };

  const handleUpdate = (row: CreateObjectsParams, key: string, value: any) => {
    const newObjects = [...objects];
    Object.assign(newObjects.find((object) => object.schema === row.schema)!, { [key]: value });
    setObjects(newObjects);
  };

  const { helper, builder } = createColumnBuilder<CreateObjectsParams>();
  const columns: TableColumnDef<CreateObjectsParams>[] = [
    helper.accessor('enabled', builder.switch({ label: 'Live', onUpdate: handleUpdate })),
    helper.accessor('schema', builder.string({ label: 'Schema', classNames: 'font-mono' })),
    helper.accessor('objectsCount', builder.number({ label: 'Objects', onUpdate: handleUpdate })),
    helper.accessor('mutationsCount', builder.number({ label: 'Mutations', onUpdate: handleUpdate })),
    helper.accessor('mutationSize', builder.number({ label: 'Mut. Size', onUpdate: handleUpdate })),
    helper.accessor('maxContentLength', builder.number({ label: 'Length', onUpdate: handleUpdate })),
  ];

  return (
    <>
      <Table.Root>
        <Table.Viewport>
          <Table.Main<CreateObjectsParams> columns={columns} data={objects} />
        </Table.Viewport>
      </Table.Root>
      <Toolbar.Root classNames='p-2'>
        <IconButton icon='ph--plus--regular' label='Create' onClick={handleCreate} />
      </Toolbar.Root>
    </>
  );
};
