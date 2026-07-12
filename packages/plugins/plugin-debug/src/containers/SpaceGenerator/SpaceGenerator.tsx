//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker, useOptionalCapability } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { useProgress } from '@dxos/app-toolkit/ui';
import { ComputeGraph } from '@dxos/conductor';
import { Filter, Obj, Type } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';
import { Sheet } from '@dxos/plugin-sheet';
import { Sketch } from '@dxos/plugin-sketch';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Panel, ScrollArea, ThemedClassName, Toolbar, useAsyncEffect } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Organization, Person, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { sortKeys } from '@dxos/util';

import { type ObjectGenerator, SchemaTable, createGenerator, generator, staticGenerators } from '#components';
import { meta } from '#meta';

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
        recordTypes.map((type) => [Type.getTypename(type), createGenerator(client, invokePromise, type)]),
      );

      return new Map([...staticGenerators, ...presets.items, ...recordGenerators]);
    }, [client, invokePromise, presets]);

    // Query space to get info.
    const updateInfo = useCallback(async () => {
      const allSchema = [...space.db.graph.registry.list().filter(Type.isType)];
      const echoSchema = allSchema.filter((t) => Type.isTypeKind(t));
      const staticSchema = allSchema.filter((t) => !Type.isTypeKind(t));

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
              <SchemaTable
                classNames='py-1'
                types={staticTypes}
                objects={info.objects}
                label='Static Types'
                onClick={handleCreateData}
              />
              <SchemaTable
                classNames='py-1'
                types={recordTypes}
                objects={info.objects}
                label='Record Types'
                onClick={handleCreateData}
              />
              <SchemaTable
                classNames='py-1'
                types={presets.types}
                objects={info.objects}
                label='Presets'
                onClick={handleCreateData}
              />
              <ProgressGenerator classNames='py-1' />
            </ScrollArea.Viewport>
          </ScrollArea.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
);

SpaceGenerator.displayName = 'SpaceGenerator';

// Stable key for the test progress monitor within the shared registry.
const TEST_PROGRESS_NAME = `${meta.profile.key}.test-progress`;

type ProgressGeneratorProps = ThemedClassName;

// Drives a synthetic progress monitor (10s over 10 steps) so the R0 rail meter can be exercised.
const ProgressGenerator = ({ classNames }: ProgressGeneratorProps) => {
  const registry = useOptionalCapability(AppCapabilities.ProgressRegistry);
  const monitor = useProgress(TEST_PROGRESS_NAME);
  const running = monitor?.status === 'running';
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const handleStart = useCallback(() => {
    if (!registry || running) {
      return;
    }

    const steps = 10;
    let current = 0;
    const handle = registry.register(TEST_PROGRESS_NAME, {
      label: 'Test Progress',
      total: steps,
      // Invoked by the meter's cancel control (R0 rail) or the local button.
      onCancel: () => {
        clearTimer();
        handle.remove();
      },
    });

    intervalRef.current = setInterval(() => {
      current += 1;
      handle.set(current);
      if (current >= steps) {
        clearTimer();
        handle.done();
        handle.remove();
      }
    }, 1_000);
  }, [registry, running, clearTimer]);

  // Tear down the timer and the registry entry if unmounted mid-run.
  useEffect(
    () => () => {
      clearTimer();
      registry?.cancel(TEST_PROGRESS_NAME);
    },
    [clearTimer, registry],
  );

  return (
    <div className={mx('flex items-center gap-2 py-1', classNames)}>
      <span className='grow'>Progress Monitor</span>
      {running ? (
        <IconButton
          icon='ph--x--regular'
          label='Cancel test progress'
          onClick={() => registry?.cancel(TEST_PROGRESS_NAME)}
        />
      ) : (
        <IconButton icon='ph--play--regular' label='Start test progress' disabled={!registry} onClick={handleStart} />
      )}
    </div>
  );
};
