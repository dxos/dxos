//
// Copyright 2025 DXOS.org
//

// Surface components that cannot be expressed as a `props` mapper, because they call hooks.

import React, { type ComponentType, useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { InvocationTraceContainer, SpaceInfoArticle, SpaceListArticle, TestingArticle } from '@dxos/devtools';
import { Feed } from '@dxos/echo';
import { useResolveRef } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as DebugSurface from '@dxos/plugin-debug/DebugSurface';
import * as ScriptOperation from '@dxos/plugin-script/ScriptOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { type Space } from '@dxos/react-client/echo';

import { Devtools } from '#types';

export type ActiveSpacePanelProps = {
  role?: string;
  /** Stable module-level article component; the surface passes it through its `props` mapper. */
  Panel: ComponentType<{ role?: string; space: Space }>;
};

/**
 * Most devtools panels take the active space and render nothing without one. A mapper cannot read
 * the active space (it is a hook) nor decline to render, so they share this wrapper.
 */
export const ActiveSpacePanel = ({ role, Panel }: ActiveSpacePanelProps) => {
  const space = useActiveSpace();

  return space ? <Panel role={role} space={space} /> : null;
};

export type NavigableSurfaceProps = {
  role?: string;
  onNavigate: DebugSurface.PageData['onNavigate'];
};

/** The space list; selecting a space shows its page in the debug panel. */
export const SpaceListSurface = ({ role, onNavigate }: NavigableSurfaceProps) => {
  const handleSelect = useCallback(() => onNavigate(Devtools.getNodePath(Devtools.Echo.Space)), [onNavigate]);

  return <SpaceListArticle role={role} onSelect={handleSelect} />;
};

/** The active space; selecting a feed or pipeline shows the feeds page in the debug panel. */
export const SpaceInfoSurface = ({ role, onNavigate }: NavigableSurfaceProps) => {
  const space = useActiveSpace();
  const handleSelect = useCallback(() => onNavigate(Devtools.getNodePath(Devtools.Echo.Feeds)), [onNavigate]);
  if (!space) {
    return null;
  }

  return <SpaceInfoArticle role={role} space={space} onSelectFeed={handleSelect} onSelectPipeline={handleSelect} />;
};

export const EdgeTracesSurface = ({ role }: { role?: string }) => {
  const space = useActiveSpace();
  const feed = useResolveRef(space?.properties.invocationTraceFeed);
  if (!space) {
    return null;
  }

  const feedDXN = feed ? Feed.getFeedUri(feed) : undefined;

  return <InvocationTraceContainer role={role} db={space.db} feedDXN={feedDXN} detailAxis='block' />;
};

export const EdgeTestingSurface = ({ role }: { role?: string }) => {
  const { invokePromise } = useOperationInvoker();
  const onScriptPluginOpen = useCallback(
    async (space: Space) => {
      await space.waitUntilReady();
      const createResult = await invokePromise(ScriptOperation.CreateScript, { db: space.db });
      if (createResult.data?.object) {
        await invokePromise(
          SpaceOperation.AddObject,
          { object: createResult.data.object },
          { spaceId: space.db.spaceId },
        );
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

  return <TestingArticle role={role} onScriptPluginOpen={onScriptPluginOpen} />;
};
