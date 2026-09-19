//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

import { meta } from '#meta';
import { DebugNodes, DebugSurface } from '#types';

import { useDebugPanelContext } from './DebugPanelContext.ts';

/** Pages that stay mounted once visited: their buffers are the point of the tool. */
const KEEP_MOUNTED: ReadonlySet<unknown> = new Set([DebugNodes.Console, DebugNodes.Logs]);

/**
 * The selected page. The console and log viewer stay mounted (hidden) once visited so they keep
 * their buffers while another tool is shown; every other page mounts only while selected.
 */
export const DebugPanelMain = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, nodeId, select } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const handleNavigate = useCallback(
    (target: string) => {
      AppGraph.expandPath(graph, target);
      select(target);
    },
    [graph, select],
  );
  const node = useNode(graph, nodeId);
  const keepMounted = node !== undefined && KEEP_MOUNTED.has(node.data);
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    if (nodeId && keepMounted) {
      // Guarded in the updater: StrictMode runs the effect twice on mount, and two appends would mount the page twice.
      setVisited((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
    }
  }, [nodeId, keepMounted]);

  if (!nodeId) {
    return <Empty label={t('debug-panel.empty.label')} />;
  }

  // Appended in the same render it is selected (the effect only catches up), so the keyed page is
  // never first mounted as the transient one and then remounted.
  const mounted = keepMounted && !visited.includes(nodeId) ? [...visited, nodeId] : visited;

  return (
    <>
      {mounted.map((id) => (
        <DebugPanelPage
          key={id}
          graph={graph}
          contextId={contextId}
          nodeId={id}
          hidden={id !== nodeId}
          onNavigate={handleNavigate}
        />
      ))}
      {!mounted.includes(nodeId) && (
        <DebugPanelPage
          key={nodeId}
          graph={graph}
          contextId={contextId}
          nodeId={nodeId}
          hidden={false}
          onNavigate={handleNavigate}
        />
      )}
    </>
  );
};

DebugPanelMain.displayName = 'DebugPanel.Main';

type DebugPanelPageProps = {
  graph: AppGraph.ReadableGraph;
  contextId: string;
  nodeId: string;
  hidden: boolean;
  onNavigate: (nodeId: string) => void;
};

/** One tool's article surface; the `div` is its show/hide element, not layout. */
const DebugPanelPage = ({ graph, contextId, nodeId, hidden, onNavigate }: DebugPanelPageProps) => {
  const { t } = useTranslation(meta.profile.key);
  const node = useNode(graph, nodeId);
  const data = useMemo<DebugSurface.PageData | undefined>(
    () =>
      node && {
        attendableId: `${contextId}/${nodeId}`,
        nodeId,
        subject: node.data,
        properties: node.properties,
        onNavigate,
      },
    [node, contextId, nodeId, onNavigate],
  );
  if (!data) {
    // A persisted id that no longer resolves (a plugin disabled) shows the empty state rather than nothing.
    return hidden ? null : <Empty label={t('debug-panel.empty.label')} />;
  }

  return (
    <div role='none' className='dx-expand' hidden={hidden}>
      <Surface.Surface type={DebugSurface.Page} data={data} limit={1} />
    </div>
  );
};
