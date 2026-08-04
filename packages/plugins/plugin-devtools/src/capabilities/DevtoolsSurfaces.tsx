//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks.

import React, { type ComponentType, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer, SpaceInfoPanel, SpaceListPanel, TestingPanel } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { log } from '@dxos/log';
import { ScriptOperation } from '@dxos/plugin-script';
import { SpaceOperation } from '@dxos/plugin-space';
import { type Space } from '@dxos/react-client/echo';

import { Devtools } from '#types';

export type ActiveSpacePanelProps = {
  /** Stable module-level panel component; the surface passes it through its `props` mapper. */
  Panel: ComponentType<{ space: Space }>;
};

/**
 * Most devtools panels take the active space and render nothing without one. A mapper cannot read
 * the active space (it is a hook) nor decline to render, so they share this wrapper.
 */
export const ActiveSpacePanel = ({ Panel }: ActiveSpacePanelProps) => {
  const space = useActiveSpace();

  return space ? <Panel space={space} /> : null;
};

export const SpaceListSurface = () => {
  const { invokePromise } = useOperationInvoker();
  const handleSelect = useCallback(
    () => invokePromise(LayoutOperation.Open, { subject: [Devtools.Echo.Space] }),
    [invokePromise],
  );

  return <SpaceListPanel onSelect={handleSelect} />;
};

export const SpaceInfoSurface = () => {
  const space = useActiveSpace();
  const { invokePromise } = useOperationInvoker();
  const handleSelect = useCallback(
    () => invokePromise(LayoutOperation.Open, { subject: [Devtools.Echo.Feeds] }),
    [invokePromise],
  );
  if (!space) {
    return null;
  }

  return <SpaceInfoPanel space={space} onSelectFeed={handleSelect} onSelectPipeline={handleSelect} />;
};

export const EdgeTracesSurface = () => {
  const space = useActiveSpace();
  if (!space) {
    return null;
  }

  const feed = space.properties.invocationTraceFeed?.target;
  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return <InvocationTraceContainer db={space.db} feedDXN={feedDXN} detailAxis='block' />;
};

export const EdgeTestingSurface = () => {
  const { invokePromise } = useOperationInvoker();
  const onSpaceCreate = useCallback(
    async (space: Space) => {
      await space.waitUntilReady();
      await invokePromise(SpaceOperation.Migrate, { space });
      await space.db.flush();
    },
    [invokePromise],
  );
  const onScriptPluginOpen = useCallback(
    async (space: Space) => {
      await space.waitUntilReady();
      const createResult = await invokePromise(ScriptOperation.CreateScript, { db: space.db });
      if (createResult.data?.object) {
        await invokePromise(SpaceOperation.AddObject, { target: space.db, object: createResult.data.object });
      }
      log.info('script created', { result: createResult });
      if (createResult.data?.object) {
        await invokePromise(LayoutOperation.Open, {
          subject: [GraphPath.getObjectPathFromObject(createResult.data.object)],
        });
      }
    },
    [invokePromise],
  );

  return <TestingPanel onSpaceCreate={onSpaceCreate} onScriptPluginOpen={onScriptPluginOpen} />;
};
