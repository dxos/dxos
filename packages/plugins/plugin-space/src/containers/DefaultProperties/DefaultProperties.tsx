//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { Capability } from '@dxos/app-framework';
import { Surface, useCapabilities, useOperationInvoker, usePluginManager } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Operation } from '@dxos/compute';
import { type Database, type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { type CreateEntryOverride, ObjectProperties } from '@dxos/react-ui-form';

import { SpaceCapabilities } from '#types';

export type DefaultPropertiesProps = AppSurface.ObjectPropertiesProps<Obj.Unknown>;

/**
 * Generic object-properties companion rendered for any object: a schema-driven {@link ObjectProperties}
 * form plus the `object-properties` surface, so plugins whose properties are plain editable fields need
 * not register a bespoke surface (mirrors `DefaultSettings` for plugin settings).
 */
export const DefaultProperties = forwardRef<HTMLDivElement, DefaultPropertiesProps>(
  ({ role, subject: object }, forwardedRef) => {
    const manager = usePluginManager();
    const operationInvoker = useOperationInvoker();
    const createEntries = useCapabilities(SpaceCapabilities.CreateObjectEntry);
    const data = useMemo<AppSurface.ObjectPropertiesData>(() => ({ subject: object }), [object]);

    const resolveCreateEntry = useCallback(
      (typename: string): CreateEntryOverride | undefined => {
        const entry = createEntries.find((e) => e.id === typename);
        if (!entry?.inputSchema && !entry?.createObject) {
          return undefined;
        }
        return {
          inputSchema: entry.inputSchema,
          createObject: async (values: any, db: Database.Database): Promise<Obj.Unknown> => {
            const result = await entry
              .createObject(values, { db, target: db })
              .pipe(
                Effect.provideService(Capability.Service, manager.capabilities),
                Effect.provideService(Operation.Service, operationInvoker),
                Effect.runPromise,
              );
            return result.object;
          },
        };
      },
      [createEntries, manager, operationInvoker],
    );

    return (
      <Panel.Root role={role} className='dx-document' ref={forwardedRef}>
        <Panel.Toolbar asChild>
          <Toolbar.Root />
        </Panel.Toolbar>
        <Panel.Content>
          <ObjectProperties object={object} resolveCreateEntry={resolveCreateEntry}>
            {/* TODO(burdon): Ambiguous naming since providers only replace parts; can't update Toolbar, etc. Consider DefaultSettings pattern. */}
            <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
          </ObjectProperties>
        </Panel.Content>
      </Panel.Root>
    );
  },
);
