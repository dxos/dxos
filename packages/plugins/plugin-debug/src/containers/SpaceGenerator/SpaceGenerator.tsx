//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { ComputeGraph } from '@dxos/conductor';
import { Filter, Obj, type Type } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Sheet } from '@dxos/plugin-sheet/types';
import { Sketch } from '@dxos/plugin-sketch/types';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Panel, ScrollArea, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { Organization, Person, Task } from '@dxos/types';
import { composable, composableProps } from '@dxos/ui-theme';
import { sortKeys } from '@dxos/util';

import { type ObjectGenerator, SchemaTable, createGenerator, generator, staticGenerators } from '#components';

// TODO(burdon): Make extensible.
const staticTypes = [Markdown.Document, Sketch.Sketch, Sheet.Sheet, ComputeGraph];
const recordTypes: Type.AnyObj[] = [Organization.Organization, Person.Person, Task.Task];

export type SpaceGeneratorProps = {
  space: Space;
  onCreateObjects?: (objects: Obj.Unknown[]) => void;
};

export const SpaceGenerator = composable<HTMLDivElement, SpaceGeneratorProps>(
  ({ space, onCreateObjects, children, ...props }, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const client = useClient();
    const [count, setCount] = useState(1);
    const [info, setInfo] = useState<any>({});
    const presets = useMemo(() => generator(), []);

    // Register types.
    useAsyncEffect(async () => {
      await client.addTypes([...staticTypes, ...recordTypes, ...presets.schemas]);
    }, [client, presets]);

    // Create type generators.
    const typeMap = useMemo(() => {
      const recordGenerators = new Map<string, ObjectGenerator<any>>(
        recordTypes.map((type) => [type.typename, createGenerator(client, invokePromise, type)]),
      );

      return new Map([...staticGenerators, ...presets.items, ...recordGenerators]);
    }, [client, invokePromise, presets]);

    // Query space to get info.
    const updateInfo = useCallback(async () => {
      const echoSchema = await space.db.schemaRegistry.query().run();
      const staticSchema = await space.db.graph.schemaRegistry.query().run();

      const objects = await space.db.query(Filter.everything()).run();
      const objectMap = sortKeys(
        objects.reduce<Record<string, number>>((map, obj) => {
          const type = Obj.getTypename(obj);
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
    }, [space]);

    useAsyncEffect(updateInfo, [updateInfo]);

    const handleCreateData = useCallback(
      async (typename: string) => {
        const constructor = typeMap.get(typename);
        if (constructor) {
          // TODO(burdon): Input to specify number of objects.
          await constructor(space, count, onCreateObjects);
          await updateInfo();
        }
      },
      [typeMap, count, space, onCreateObjects, updateInfo],
    );

    return (
      <Panel.Root {...composableProps(props)} ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton icon='ph--arrow-clockwise--regular' iconOnly label='Refresh' onClick={updateInfo} />
            <Toolbar.Separator />
            <Input.Root>
              <Input.TextInput
                type='number'
                placeholder='Count'
                classNames='w-[4rem] text-right'
                min={1}
                max={100}
                size={8}
                value={count}
                onChange={(event) => setCount(parseInt(event.target.value))}
              />
            </Input.Root>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ScrollArea.Root thin orientation='vertical'>
            <ScrollArea.Viewport classNames='dx-document gap-4 divide-y divide-subdued-separator'>
              <SchemaTable types={staticTypes} objects={info.objects} label='Static Types' onClick={handleCreateData} />
              <SchemaTable types={recordTypes} objects={info.objects} label='Record Types' onClick={handleCreateData} />
              <SchemaTable types={presets.types} objects={info.objects} label='Presets' onClick={handleCreateData} />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
