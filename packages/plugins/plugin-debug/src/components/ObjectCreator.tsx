//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type EchoReactiveObject, type ReactiveObject, type Space } from '@dxos/react-client/echo';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { createColumnBuilder, type TableColumnDef, Table } from '@dxos/react-ui-table/deprecated';

import { SchemasNames, createSpaceObjectGenerator } from '../scaffolding';

export type CreateObjectsParams = {
  enabled: boolean;
  schema: SchemasNames;
  objectsCount: number;
  mutationsCount: number;
  maxContentLength: number;
  mutationSize: number;
};

const CREATE_OBJECTS_IN_ONE_CHUNK = 10;

export type ObjectCreatorProps = {
  space: Space;
  onAddObjects?: (objects: ReactiveObject<any>[]) => void;
};

export const ObjectCreator = ({ space, onAddObjects }: ObjectCreatorProps) => {
  const generator = useMemo(() => createSpaceObjectGenerator(space), [space]);

  const [objectsToCreate, setObjectsToCreate] = useState<CreateObjectsParams[]>([
    {
      enabled: true,
      schema: SchemasNames.document,
      objectsCount: 10,
      mutationsCount: 10,
      mutationSize: 10,
      maxContentLength: 1000,
    },
    {
      enabled: true,
      schema: SchemasNames.diagram,
      objectsCount: 10,
      mutationsCount: 10,
      mutationSize: 10,
      maxContentLength: 1000,
    },
  ]);

  const handleCreate = async () => {
    for (const params of objectsToCreate) {
      if (!params.enabled) {
        continue;
      }

      let objectsCreated = 0;
      while (objectsCreated < params.objectsCount) {
        const objects = (await generator.createObjects({
          [params.schema]: Math.min(CREATE_OBJECTS_IN_ONE_CHUNK, params.objectsCount - objectsCreated),
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
    const newObjects = [...objectsToCreate];
    Object.assign(newObjects.find((object) => object.schema === row.schema)!, { [key]: value });
    setObjectsToCreate(newObjects);
  };

  const { helper, builder } = createColumnBuilder<CreateObjectsParams>();
  const columns: TableColumnDef<CreateObjectsParams>[] = [
    helper.accessor('enabled', builder.switch({ label: 'Enabled', onUpdate: handleUpdate })),
    helper.accessor('schema', builder.string({ classNames: 'font-mono', label: 'Schema' })),
    helper.accessor('objectsCount', builder.number({ label: 'Objects', onUpdate: handleUpdate })),
    helper.accessor('mutationsCount', builder.number({ label: 'Mutations', onUpdate: handleUpdate })),
    helper.accessor('mutationSize', builder.number({ label: 'Mut. Size', onUpdate: handleUpdate })),
    helper.accessor('maxContentLength', builder.number({ label: 'Length', onUpdate: handleUpdate })),
  ];

  return (
    <>
      <Table.Root>
        <Table.Viewport>
          <Table.Main<CreateObjectsParams> columns={columns} data={objectsToCreate} />
        </Table.Viewport>
      </Table.Root>
      <Toolbar.Root>
        <IconButton icon='ph--plus--regular' label='Create' onClick={handleCreate} />
      </Toolbar.Root>
    </>
  );
};
