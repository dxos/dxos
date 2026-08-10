//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useOperationInvoker, useOptionalCapability } from '@dxos/app-framework/ui';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { useProgress } from '@dxos/app-toolkit/ui';
import { ComputeGraph } from '@dxos/conductor';
import { Filter, Obj, Type } from '@dxos/echo';
import { log } from '@dxos/log';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { SpaceOperation } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, Input, Panel, ScrollArea, ThemedClassName, Toast, useAsyncEffect } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { type ActionGraphProps, Menu, MenuBuilder, useMenuBuilder } from '@dxos/react-ui-menu';
import { Organization, Person, Task } from '@dxos/types';
import { mx } from '@dxos/ui-theme';
import { sortKeys } from '@dxos/util';

import { type ObjectGenerator, SchemaTable, createGenerator, generator, staticGenerators } from '#components';
import { meta } from '#meta';

// TODO(burdon): Make extensible.
const staticTypes = [Markdown.Document, Drawing.Drawing, Sheet.Sheet, ComputeGraph];
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
    // Both destructive actions report only through the object counts, which do not move when a pass
    // reclaims nothing — leaving the button indistinguishable from one that did not fire.
    const [toast, setToast] = useState<{ title: string; description?: string }>();
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

    const showToast = useCallback((title: string, description?: string) => {
      setToast({ title, description });
      const timer = setTimeout(() => setToast(undefined), 5_000);
      return () => clearTimeout(timer);
    }, []);

    const handleReset = useCallback(async () => {
      if (!window.confirm('Remove all objects from this space? This cannot be undone.')) {
        return;
      }
      try {
        const { data, error } = await invokePromise(SpaceOperation.RemoveAllObjects, undefined, { spaceId: space.id });
        if (error) {
          log.catch(error);
          showToast('Failed to remove objects', error.message);
          return;
        }
        showToast('Space cleared', `Removed ${data?.objectIds.length ?? 0} objects.`);
        await updateInfo();
      } catch (error: any) {
        log.catch(error);
        showToast('Failed to remove objects', error?.message ?? String(error));
      }
    }, [space, invokePromise, updateInfo, showToast]);

    const handleCollectGarbage = useCallback(async () => {
      if (!window.confirm("Permanently reclaim this space's deleted objects? This cannot be undone.")) {
        return;
      }
      try {
        const { data, error } = await invokePromise(SpaceOperation.CollectGarbage, undefined, { spaceId: space.id });
        if (error) {
          log.catch(error);
          showToast('Garbage collection failed', error.message);
          return;
        }
        const { removedDocuments = 0, unlinkedObjects = 0 } = data ?? {};
        showToast(
          'Garbage collected',
          removedDocuments === 0
            ? 'Nothing to reclaim.'
            : `Reclaimed ${removedDocuments} document${removedDocuments === 1 ? '' : 's'} from ${unlinkedObjects} object${unlinkedObjects === 1 ? '' : 's'}.`,
        );
        await updateInfo();
      } catch (error: any) {
        log.catch(error);
        showToast('Garbage collection failed', error?.message ?? String(error));
      }
    }, [space, invokePromise, updateInfo, showToast]);

    // The toolbar's own action items own the pending state: each awaits its invoke, disables only
    // itself while in flight, and guards re-entry — so nothing here tracks that.
    const menuActions = useMenuBuilder(
      (): ActionGraphProps =>
        MenuBuilder.make()
          .action(
            'refresh',
            { label: 'Refresh', icon: 'ph--arrow-clockwise--regular', testId: 'spaceGenerator.refresh' },
            () => void updateInfo(),
          )
          .action(
            'reset',
            { label: 'Reset space', icon: 'ph--trash--regular', testId: 'spaceGenerator.reset' },
            handleReset,
          )
          .action(
            'collect',
            { label: 'Collect garbage', icon: 'ph--recycle--regular', testId: 'spaceGenerator.collectGarbage' },
            handleCollectGarbage,
          )
          .separator('gap')
          .build(),
      [updateInfo, handleReset, handleCollectGarbage],
    );

    const handleCreateData = useCallback(
      async (typename: string) => {
        const constructor = typeMap.get(typename);
        if (constructor) {
          // TODO(burdon): Input to specify number of objects.
          await constructor(space, count, onCreateObjects);
          await updateInfo();
        }
      },
      [space, typeMap, count, updateInfo, onCreateObjects],
    );

    return (
      // `alwaysActive`: the toolbar gates itself on the menu scope's attention, and this debug panel
      // is not an attendable surface, so without it every action renders disabled.
      <Menu.Root {...menuActions} alwaysActive>
        <Panel.Root {...composableProps(props)} ref={forwardedRef}>
          <Panel.Toolbar>
            <Menu.Toolbar classNames='dx-document'>
              <Menu.Items />
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
            </Menu.Toolbar>
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
          {toast && (
            <Toast.Root>
              <Toast.Title icon='ph--recycle--duotone'>
                <span>{toast.title}</span>
              </Toast.Title>
              {toast.description && <Toast.Description>{toast.description}</Toast.Description>}
            </Toast.Root>
          )}
        </Panel.Root>
      </Menu.Root>
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
    // Guard on the timer ref too: `running` (derived from the registry) can lag a fast second click.
    if (!registry || running || intervalRef.current) {
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
