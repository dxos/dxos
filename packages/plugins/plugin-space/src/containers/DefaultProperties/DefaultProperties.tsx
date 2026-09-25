//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { forwardRef, useCallback, useMemo } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import {
  Surface,
  useActivationSignal,
  useCapabilities,
  useOperationInvoker,
  usePluginManager,
} from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import * as Operation from '@dxos/compute/Operation';
import { type Database, type Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { type CreateEntryOverride, ObjectProperties } from '@dxos/react-ui-form';

import { SpaceCapabilities, SpaceEvents } from '#types';

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
    // Demand signal: this companion can create related objects, so pull parked entry providers.
    useActivationSignal(SpaceEvents.CreateObjectRequested);
    const createEntries = useCapabilities(SpaceCapabilities.CreateObjectEntry);
    const data = useMemo<AppSurface.ObjectPropertiesData>(() => ({ subject: object }), [object]);

    const resolveCreateEntry = useCallback(
      (typename: string): CreateEntryOverride | undefined => {
        const entry = createEntries.find((createEntry) => createEntry.id === typename);
        if (!entry?.inputSchema && !entry?.createObject) {
          return undefined;
        }
        return {
          inputSchema: entry.inputSchema,
          createObject: async (values: any, db: Database.Database): Promise<Obj.Unknown | undefined> => {
            const result = await entry
              .createObject(values, { db })
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
      <Panel.Root role={role} ref={forwardedRef}>
        <Panel.Toolbar>
          <Toolbar.Root classNames='dx-document' />
        </Panel.Toolbar>
        <Panel.Content asChild>
          <ObjectProperties object={object} resolveCreateEntry={resolveCreateEntry}>
            {/* TODO(burdon): Ambiguous naming since providers only replace parts; can't update Toolbar, etc. Consider DefaultSettings pattern. */}
            <Surface.Surface type={AppSurface.ObjectProperties} data={data} />
          </ObjectProperties>
        </Panel.Content>
      </Panel.Root>
    );
  },
);

DefaultProperties.displayName = 'DefaultProperties';
