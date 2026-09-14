//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import type * as AppGraph from '@dxos/app-graph/AppGraph';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';

import { meta } from '#meta';

import { useDebugPanelContext } from './DebugPanelContext.ts';

/**
 * The selected page. Every page visited stays mounted (hidden) so the console and log viewer keep
 * their buffers while another tool is shown.
 */
export const DebugPanelMain = () => {
  const { t } = useTranslation(meta.profile.key);
  const { contextId, nodeId } = useDebugPanelContext();
  const { graph } = useAppGraph();
  const [visited, setVisited] = useState<string[]>([]);
  useEffect(() => {
    if (nodeId && !visited.includes(nodeId)) {
      setVisited((prev) => [...prev, nodeId]);
    }
  }, [nodeId, visited]);

  if (!nodeId) {
    return <Empty label={t('debug-panel.empty.label')} />;
  }

  return (
    <>
      {visited.map((id) => (
        <DebugPanelPage key={id} graph={graph} contextId={contextId} nodeId={id} hidden={id !== nodeId} />
      ))}
    </>
  );
};

DebugPanelMain.displayName = 'DebugPanel.Main';

type DebugPanelPageProps = {
  graph: AppGraph.ReadableGraph;
  contextId: string;
  nodeId: string;
  hidden: boolean;
};

/** One tool's article surface; the `div` is its show/hide element, not layout. */
const DebugPanelPage = ({ graph, contextId, nodeId, hidden }: DebugPanelPageProps) => {
  const node = useNode(graph, nodeId);
  const data = useMemo<AppSurface.ArticleData | undefined>(
    () => node && { attendableId: `${contextId}/${nodeId}`, nodeId, subject: node.data, properties: node.properties },
    [node, contextId, nodeId],
  );
  if (!data) {
    return null;
  }

  return (
    <div role='none' className='dx-expand' hidden={hidden}>
      <Surface.Surface type={AppSurface.Article} data={data} limit={1} />
    </div>
  );
};
