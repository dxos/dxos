//
// Copyright 2026 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks or compose.

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Option from 'effect/Option';
import React, { useCallback, useMemo } from 'react';

import { useAtomCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { SettingsScope, useActiveSpace } from '@dxos/app-toolkit/ui';
import { Annotation, Collection, Entity, Filter, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation } from '@dxos/echo/Annotation';
import { type IdbLogStore } from '@dxos/log-store-idb';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { useClient } from '@dxos/react-client';
import { type Space, SpaceState } from '@dxos/react-client/echo';

import { DebugObjectPanel, DebugSettings, DebugSpaceObjectsPanel, SpaceGenerator } from '#containers';
import { Settings } from '#types';

//
// DebugSettings
//

export type DebugSettingsSurfaceProps = {
  subject: AppCapabilities.Settings;
  logStore?: IdbLogStore;
  onUpload?: AppCapabilities.FileUploader;
};

export const DebugSettingsSurface = ({ subject, logStore, onUpload }: DebugSettingsSurfaceProps) => {
  const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);

  return (
    <DebugSettings
      settings={settings}
      onSettingsChange={updateSettings}
      logStore={logStore}
      onUpload={onUpload}
      scope={<SettingsScope prefix={subject.prefix} />}
    />
  );
};

//
// SpaceGeneratorSurface
//

export type SpaceGeneratorSurfaceProps = {
  role: string;
  space: Space;
};

/** Generated objects are added to the space's root collection, resolved at invocation time. */
export const SpaceGeneratorSurface = ({ role, space }: SpaceGeneratorSurfaceProps) => {
  const { invokePromise } = useOperationInvoker();

  const handleCreateObjects = useCallback(
    (objects: Obj.Unknown[]) => {
      const collection =
        space.state.get() === SpaceState.SPACE_READY &&
        Annotation.get(space.properties, AppAnnotation.RootCollectionAnnotation).pipe(Option.getOrUndefined)?.target;
      if (!Obj.instanceOf(Collection.Collection, collection)) {
        return;
      }

      objects.forEach((object) => {
        void invokePromise(SpaceOperation.AddObject, { target: collection, object });
      });
    },
    [space, invokePromise],
  );

  return <SpaceGenerator role={role} space={space} onCreateObjects={handleCreateObjects} />;
};

//
// ObjectDebugSurface
//

export type ObjectDebugSurfaceProps = {
  role: string;
  companionTo: Obj.Unknown;
};

export const ObjectDebugSurface = ({ role, companionTo }: ObjectDebugSurfaceProps) => {
  const { invokePromise } = useOperationInvoker();
  const { onOpen, canOpen } = useObjectOpenAction(invokePromise);

  return <DebugObjectPanel role={role} companionTo={companionTo} onOpen={onOpen} canOpen={canOpen} />;
};

//
// SpaceObjectsSurface
//

export const SpaceObjectsSurface = () => {
  const space = useActiveSpace();
  const { invokePromise } = useOperationInvoker();
  const { onOpen, canOpen } = useObjectOpenAction(invokePromise);
  if (!space) {
    return null;
  }

  return <DebugSpaceObjectsPanel space={space} onOpen={onOpen} canOpen={canOpen} />;
};

/** Returns `onOpen` and `canOpen` for the ObjectsTree "Open" action. */
const useObjectOpenAction = (invokePromise: ReturnType<typeof useOperationInvoker>['invokePromise']) => {
  const client = useClient();
  const spaceSettings = useAtomCapability(SpaceCapabilities.SettingsAtom);
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
      void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(object)] });
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
