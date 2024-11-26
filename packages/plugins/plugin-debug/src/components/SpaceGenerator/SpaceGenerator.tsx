//
// Copyright 2024 DXOS.org
//

import { Effect } from 'effect';
import React, { useCallback, useMemo, useState } from 'react';

import { create, type ReactiveObject, type BaseObject } from '@dxos/echo-schema';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, getTypename, type Space } from '@dxos/react-client/echo';
import { IconButton, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { TableType } from '@dxos/react-ui-table';
import { createView } from '@dxos/schema';
import { createArrayPipeline, createObjectPipeline, Test, type ValueGenerator } from '@dxos/schema/testing';
import { jsonKeyReplacer } from '@dxos/util';

const generator: ValueGenerator = faker as any;

// TODO(burdon): Infer reference.
// TODO(burdon): Create docs.
// TODO(burdon): Create sketches.
// TODO(burdon): Create sheets.
// TODO(burdon): Create comments.
// TODO(burdon): Mutator running in background (factor out).

export type SpaceGeneratorProps = {
  space: Space;
  onAddObjects?: (objects: ReactiveObject<any>[]) => void;
};

// TODO(burdon): Reuse in testbench-app.
export const SpaceGenerator = ({ space, onAddObjects }: SpaceGeneratorProps) => {
  const client = useClient();
  const staticTypes = [DocumentType]; // TODO(burdon): Plugins.
  const mutableTypes = [Test.OrgType, Test.ProjectType, Test.ContactType];
  const [info, setInfo] = useState<any>({});

  // Create type generators.
  const typeMap = useMemo(() => {
    client.addTypes([TableType]);

    return new Map<string, (n: number) => Promise<BaseObject<any>>>(
      mutableTypes.map((type) => {
        return [
          type.typename,
          async (n: number) => {
            // Find or create mutable schema.
            const mutableSchema = await space.db.schemaRegistry.query();
            const schema =
              mutableSchema.find((schema) => schema.typename === type.typename) ??
              space.db.schemaRegistry.addSchema(type);

            // Create objects.
            const pipeline = createObjectPipeline(generator, schema.schema, space.db);
            const objects = await Effect.runPromise(createArrayPipeline(n, pipeline));

            // Find or create table and view.
            const { objects: tables } = await space.db.query(Filter.schema(TableType)).run();
            const table = tables.find((table) => table.view?.query?.typename === type.typename);
            if (!table) {
              const name = type.typename.split('/').pop() ?? type.typename;
              const table = space.db.add(
                create(TableType, {
                  name,
                  view: createView({
                    name,
                    typename: type.typename,
                    jsonSchema: schema.jsonSchema,
                  }),
                }),
              );

              // Add to UX.
              onAddObjects?.([table]);
            }

            return objects;
          },
        ];
      }),
    );
  }, [client, mutableTypes]);

  // Query space to get info.
  const updateInfo = async () => {
    // Create schema map.
    const mutableSchema = await space.db.schemaRegistry.query();
    const staticSchema = space.db.graph.schemaRegistry.schemas;

    // Create object map.
    const { objects } = await space.db.query().run();
    const objectMap = objects.reduce<Record<string, number>>((map, obj) => {
      const type = getTypename(obj);
      if (type) {
        const count = map[type] ?? 0;
        map[type] = count + 1;
      }
      return map;
    }, {});

    setInfo({
      schema: {
        static: staticSchema.length,
        mutable: mutableSchema.length,
      },
      objects: objectMap,
    });
  };

  useAsyncEffect(updateInfo, [space]);

  const handleCreateData = useCallback(
    async (typename: string) => {
      await typeMap.get(typename)?.(10);
      await updateInfo();
    },
    [typeMap],
  );

  return (
    <div role='none' className='flex flex-col divide-y divide-separator'>
      <Toolbar.Root classNames='p-1'>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={updateInfo} />
      </Toolbar.Root>

      <SchemaTable types={staticTypes} objects={info.objects} label='Static Types' onClick={handleCreateData} />
      <SchemaTable types={mutableTypes} objects={info.objects} label='Mutable Types' onClick={handleCreateData} />

      <SyntaxHighlighter classNames='flex text-xs' language='json'>
        {JSON.stringify({ space, ...info }, jsonKeyReplacer({ truncate: true }), 2)}
      </SyntaxHighlighter>
    </div>
  );
};

type SchemaTableProps = {
  types: any[];
  objects?: Record<string, number | undefined>;
  label: string;
  onClick: (typename: string) => void;
};

const SchemaTable = ({ types, objects = {}, label, onClick }: SchemaTableProps) => {
  return (
    <div className='grid grid-cols-[1fr_80px_40px] gap-1 overflow-hidden'>
      <div className='grid grid-cols-subgrid col-span-3'>
        <div className='px-2 py-1'>{label}</div>
      </div>
      {types.map((type) => (
        <div key={type.typename} className='grid grid-cols-subgrid col-span-3 items-center'>
          <div className='px-2 py-1 text-sm font-mono'>{type.typename}</div>
          <div className='px-2 py-1 text-right font-mono'>{objects[type.typename] ?? 0}</div>
          <IconButton
            variant='ghost'
            icon='ph--plus--regular'
            iconOnly
            label='Create data'
            onClick={() => onClick(type.typename)}
          />
        </div>
      ))}
    </div>
  );
};
