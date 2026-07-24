//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppAnnotation, AppCapabilities, LayoutOperation, Paths } from '@dxos/app-toolkit';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Annotation, Collection, Entity, Filter, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';
import { LogPanel } from '@dxos/react-ui-debug';
import { Position } from '@dxos/util';

import {
  DebugObjectPanel,
  DebugSettings,
  DebugSpaceObjectsPanel,
  DebugStatus,
  LogStatus,
  SpaceGenerator,
  StatsPanel,
  Wireframe,
} from '#containers';
import { meta } from '#meta';
import { DebugCapabilities, DebugNodes, DebugSurface, type Settings } from '#types';

type SpaceDebug = {
  type: string;
  space: Space;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === DebugNodes.SpaceType && isSpace(data.space);

/** Returns `onOpen` and `canOpen` for the ObjectsTree "Open" action. */
const useObjectOpenAction = (invokePromise: ReturnType<typeof useOperationInvoker>['invokePromise']) => {
  const client = useClient();
  const spaceSettings = useAtomCapability(SpaceCapabilities.Settings);
  const showHidden = spaceSettings?.showHidden ?? false;

  const allTypes = useAtomValue(useMemo(() => client.graph.registry.query(Filter.type(Type.Type)).atom, [client]));

  const hiddenTypenames = useMemo(() => {
    const result = new Set<string>();
    for (const typeEntity of allTypes) {
      const schema = Type.getSchema(typeEntity);
      if (HiddenAnnotation.get(schema).pipe(Option.getOrElse(() => false))) {
        result.add(Type.getTypename(typeEntity));
      }
    }
    return result;
  }, [allTypes]);

  const onOpen = useCallback(
    (object: Obj.Unknown) => {
      void invokePromise(LayoutOperation.Open, { subject: [Paths.getObjectPathFromObject(object)] });
    },
    [invokePromise],
  );

  const canOpen = useCallback(
    (entity: Entity.Snapshot) => {
      if (showHidden) {
        return true;
      }
      const typename = Entity.getTypename(entity);
      return !hiddenTypenames.has(typename ?? '');
    },
    [showHidden, hiddenTypenames],
  );

  return { onOpen, canOpen };
};

type ReactSurfaceOptions = {
  logStore?: IdbLogStore;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ logStore }: ReactSurfaceOptions) {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Capabilities.AtomRegistry);
    const settingsAtom = capabilities.get(DebugCapabilities.Settings);
    const fileUploader = capabilities.getAll(AppCapabilities.FileUploader)[0];

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return (
            <DebugSettings
              settings={settings}
              onSettingsChange={updateSettings}
              logStore={logStore}
              onUpload={fileUploader}
            />
          );
        },
      }),
      Surface.create({
        id: 'space',
        filter: AppSurface.subject(AppSurface.Article, isSpaceDebug),
        component: ({ role, data }) => {
          const { invokePromise } = useOperationInvoker();

          const handleCreateObject = useCallback(
            (objects: Obj.Unknown[]) => {
              if (!isSpace(data.subject.space)) {
                return;
              }

              const collection =
                data.subject.space.state.get() === SpaceState.SPACE_READY &&
                Annotation.get(data.subject.space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
                  Option.getOrUndefined,
                )?.target;
              if (!Obj.instanceOf(Collection.Collection, collection)) {
                return;
              }

              objects.forEach((object) => {
                void invokePromise(SpaceOperation.AddObject, {
                  target: collection,
                  object,
                });
              });
            },
            [data.subject.space, invokePromise],
          );

          return <SpaceGenerator role={role} space={data.subject.space} onCreateObjects={handleCreateObject} />;
        },
      }),
      Surface.create({
        id: 'wireframe',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
          AppSurface.subject(AppSurface.Section, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
        ),
        position: Position.first,
        component: ({ data, role, name }) => (
          <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
        ),
      }),
      Surface.create({
        id: 'objectDebug',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'debug'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ role, data }) => {
          const { invokePromise } = useOperationInvoker();
          const { onOpen, canOpen } = useObjectOpenAction(invokePromise);
          return <DebugObjectPanel role={role} companionTo={data.companionTo} onOpen={onOpen} canOpen={canOpen} />;
        },
      }),
      Surface.create({
        id: 'spaceObjects',
        filter: Surface.makeFilter(AppSurface.deckCompanion('spaceObjects')),
        component: () => {
          const space = useActiveSpace();
          const { invokePromise } = useOperationInvoker();
          const { onOpen, canOpen } = useObjectOpenAction(invokePromise);
          if (!space) {
            return null;
          }

          return <DebugSpaceObjectsPanel space={space} onOpen={onOpen} canOpen={canOpen} />;
        },
      }),
      Surface.create({
        id: 'debugStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        position: Position.first,
        component: () => <DebugStatus />,
      }),
      Surface.create({
        id: 'logs',
        filter: Surface.makeFilter(AppSurface.deckCompanion('logs')),
        component: () => <LogPanel />,
      }),
      Surface.create({
        id: 'logStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: () => <LogStatus />,
      }),
      Surface.create({
        id: 'statsPanel',
        filter: Surface.makeFilter(DebugSurface.Stats),
        component: () => <StatsPanel />,
      }),
    ]);
  }),
);
