//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Filter, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { DiagramType } from '@dxos/plugin-sketch/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { useClient } from '@dxos/react-client';
import { getTypename, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { initializeTable, TableType } from '@dxos/react-ui-table';
import { DataType } from '@dxos/schema';
import { jsonKeyReplacer, sortKeys } from '@dxos/util';

import { createGenerator, staticGenerators, type ObjectGenerator } from './ObjectGenerator';
import { SchemaTable } from './SchemaTable';
import { generator } from './presets';

export type SpaceGeneratorProps = {
  space: Space;
  onCreateObjects?: (objects: Obj.Any[]) => void;
};

export const SpaceGenerator = ({ space, onCreateObjects }: SpaceGeneratorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const staticTypes = [DocumentType, DiagramType, SheetType, ComputeGraph]; // TODO(burdon): Make extensible.
  const mutableTypes = [DataType.Organization, DataType.Project, DataType.Person, DataType.Message];
  const [count, setCount] = useState(1);
  const [info, setInfo] = useState<any>({});
  const presets = useMemo(() => generator(), []);

  // Create type generators.
  const typeMap = useMemo(() => {
    client.addTypes([...staticTypes, ...presets.schemas]);
    const mutableGenerators = new Map<string, ObjectGenerator<any>>(
      mutableTypes.map((type) => [type.typename, createGenerator(type as any)]),
    );

    return new Map([...staticGenerators, ...presets.items, ...mutableGenerators]);
  }, [client, mutableTypes]);

  // Query space to get info.
  const updateInfo = async () => {
    // Create schema map.
    const echoSchema = await space.db.schemaRegistry.query().run();
    const staticSchema = space.db.graph.schemaRegistry.schemas;

    // Create object map.
    const { objects } = await space.db.query(Filter.everything()).run();
    const objectMap = sortKeys(
      objects.reduce<Record<string, number>>((map, obj) => {
        const type = getTypename(obj);
        if (type) {
          const count = map[type] ?? 0;
          map[type] = count + 1;
        }
        return map;
      }, {}),
    );

    setInfo({
      schema: {
        static: staticSchema.length,
        mutable: echoSchema.length,
      },
      objects: objectMap,
    });
  };

  useAsyncEffect(updateInfo, [space]);

  const handleCreateData = useCallback(
    async (typename: string) => {
      const constructor = typeMap.get(typename);
      if (constructor) {
        // TODO(burdon): Input to specify number of objects.
        await constructor(space, count, onCreateObjects);
        await updateInfo();
      }
    },
    [typeMap, count],
  );

  // TODO(wittjosiah): Remove. Replace with proper echo import.
  const handleLoadTables = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        return;
      }

      try {
        const content = await file.text();
        const data = JSON.parse(content);
        const schemas = await space.db.schemaRegistry.register(data.schemas.map(Type.toEffectSchema));
        // TODO(wittjosiah): If the schema is already registered this should skip.
        await Promise.all(
          schemas.map(async (schema) => {
            const parts = schema.typename.split('/');
            const name = parts[parts.length - 1];
            const table = Obj.make(TableType, { name, threads: [] });
            await initializeTable({ client, space, table, typename: schema.typename });
            await dispatch(createIntent(SpaceAction.AddObject, { target: space, object: table }));
            return table;
          }),
        );
        // TODO(wittjosiah): This should query the space for schemas.
        await Promise.all(
          data.objects.map(async ({ id, '@type': typename, ...fields }: any) => {
            const schema = schemas.find((s) => `dxn:type:${s.typename}:${s.version}` === typename);
            if (!schema) {
              log.warn('Missing schema for object', { id, typename });
              return;
            }
            const object = Obj.make(schema, fields);
            space.db.add(object);
            return object;
          }),
        );
      } catch (err) {
        log.catch(err);
      }
    };

    input.click();
  }, []);

  return (
    <div role='none' className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={updateInfo} />
        <IconButton
          icon='ph--file-arrow-up--regular'
          iconOnly
          label='Load tables from JSON'
          onClick={handleLoadTables}
        />
        <Toolbar.Separator variant='gap' />
        <Input.Root>
          <Input.TextInput
            type='number'
            min={1}
            max={100}
            placeholder={'Count'}
            classNames='!w-[4rem] !text-right'
            size={8}
            value={count}
            onChange={(ev) => setCount(parseInt(ev.target.value))}
          />
        </Input.Root>
      </Toolbar.Root>

      <div className='flex flex-col overflow-y-auto divide-y divide-separator'>
        <SchemaTable types={staticTypes} objects={info.objects} label='Static Types' onClick={handleCreateData} />
        <SchemaTable types={mutableTypes} objects={info.objects} label='Mutable Types' onClick={handleCreateData} />
        <SchemaTable types={presets.types} objects={info.objects} label='Presets' onClick={handleCreateData} />

        <div>
          <SyntaxHighlighter classNames='flex text-xs' language='json'>
            {JSON.stringify({ space, ...info }, jsonKeyReplacer({ truncate: true }), 2)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};
