//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useIntentDispatcher } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Filter, type Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { DiagramType } from '@dxos/plugin-sketch/types';
import { useClient } from '@dxos/react-client';
import { type Space, getTypename } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { DataType } from '@dxos/schema';
import { jsonKeyReplacer, sortKeys } from '@dxos/util';

import { type ObjectGenerator, createGenerator, staticGenerators } from './ObjectGenerator';
import { generator } from './presets';
import { SchemaTable } from './SchemaTable';

export type SpaceGeneratorProps = {
  space: Space;
  onCreateObjects?: (objects: Obj.Any[]) => void;
};

export const SpaceGenerator = ({ space, onCreateObjects }: SpaceGeneratorProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const client = useClient();
  const staticTypes = [Markdown.Document, DiagramType, SheetType, ComputeGraph]; // TODO(burdon): Make extensible.
  const recordTypes = [DataType.Organization, DataType.Person, DataType.Task];
  const [count, setCount] = useState(1);
  const [info, setInfo] = useState<any>({});
  const presets = useMemo(() => generator(), []);

  // Create type generators.
  const typeMap = useMemo(() => {
    client.addTypes([...staticTypes, ...recordTypes, ...presets.schemas]);
    const recordGenerators = new Map<string, ObjectGenerator<any>>(
      recordTypes.map((type) => [type.typename, createGenerator(client, dispatch, type as any)]),
    );

    return new Map([...staticGenerators, ...presets.items, ...recordGenerators]);
  }, [client, recordTypes]);

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

  return (
    <div role='none' className='flex flex-col grow overflow-hidden'>
      <Toolbar.Root classNames='border-be border-subduedSeparator'>
        <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={updateInfo} />
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
        <SchemaTable types={recordTypes} objects={info.objects} label='Record Types' onClick={handleCreateData} />
        <SchemaTable types={presets.types} objects={info.objects} label='Presets' onClick={handleCreateData} />

        <div>
          <SyntaxHighlighter language='json' classNames='text-xs'>
            {JSON.stringify({ space, ...info }, jsonKeyReplacer({ truncate: true }), 2)}
          </SyntaxHighlighter>
        </div>
      </div>
    </div>
  );
};
