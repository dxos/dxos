//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { type ReactiveObject } from '@dxos/live-object';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { SheetType } from '@dxos/plugin-sheet/types';
import { DiagramType } from '@dxos/plugin-sketch/types';
import { useClient } from '@dxos/react-client';
import { getTypename, type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { Testing } from '@dxos/schema/testing';
import { jsonKeyReplacer, sortKeys } from '@dxos/util';

import { type ObjectGenerator, createGenerator, staticGenerators } from './ObjectGenerator';
import { SchemaTable } from './SchemaTable';
import { Container } from '../Container';

export type SpaceGeneratorProps = {
  space: Space;
  onCreateObjects?: (objects: ReactiveObject<any>[]) => void;
};

export const SpaceGenerator = ({ space, onCreateObjects }: SpaceGeneratorProps) => {
  const client = useClient();
  const staticTypes = [DocumentType, DiagramType, SheetType]; // TODO(burdon): Make extensible.
  const mutableTypes = [Testing.OrgType, Testing.ProjectType, Testing.ContactType];
  const [count, setCount] = useState(1);
  const [info, setInfo] = useState<any>({});

  // Create type generators.
  const typeMap = useMemo(() => {
    client.addTypes(staticTypes);
    const mutableGenerators = new Map<string, ObjectGenerator<any>>(
      mutableTypes.map((type) => [type.typename, createGenerator(type)]),
    );

    return new Map([...staticGenerators, ...mutableGenerators]);
  }, [client, mutableTypes]);

  // Query space to get info.
  const updateInfo = async () => {
    // Create schema map.
    const mutableSchema = await space.db.schemaRegistry.query();
    const staticSchema = space.db.graph.schemaRegistry.schemas;

    // Create object map.
    const { objects } = await space.db.query().run();
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
        mutable: mutableSchema.length,
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
    <Container
      toolbar={
        <Toolbar.Root classNames='p-1'>
          <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={updateInfo} />
          <Toolbar.Expander />
          <div className='flex'>
            <Input.Root>
              <Input.TextInput
                type='number'
                min={1}
                max={100}
                placeholder={'Count'}
                classNames='w-[80px]'
                value={count}
                onChange={(ev) => setCount(parseInt(ev.target.value))}
              />
            </Input.Root>
          </div>
        </Toolbar.Root>
      }
    >
      <SchemaTable types={staticTypes} objects={info.objects} label='Static Types' onClick={handleCreateData} />
      <SchemaTable types={mutableTypes} objects={info.objects} label='Mutable Types' onClick={handleCreateData} />

      <SyntaxHighlighter classNames='flex text-xs' language='json'>
        {JSON.stringify({ space, ...info }, jsonKeyReplacer({ truncate: true }), 2)}
      </SyntaxHighlighter>
    </Container>
  );
};
