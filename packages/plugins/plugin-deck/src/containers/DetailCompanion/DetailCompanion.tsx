//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/hooks';
import { useAttentionAttributes } from '@dxos/react-ui-attention';

import { useNodeActionExpander } from '#hooks';

export type DetailCompanionProps = {
  role: string;
  detail: string;
};

export const DetailCompanion = ({ role, detail }: DetailCompanionProps) => {
  const node = useRestoredNode(detail);
  useNodeActionExpander(node);
  const attentionAttrs = useAttentionAttributes(detail);
  const data = useMemo<AppSurface.ArticleData | undefined>(
    () => node && { attendableId: detail, nodeId: node.id, subject: node.data, properties: node.properties },
    [detail, node],
  );
  if (!data) {
    return null;
  }

  return (
    <div className='contents' {...attentionAttrs}>
      <Surface.Surface key={detail} type={AppSurface.Article} role={role} data={data} limit={1} />
    </div>
  );
};

DetailCompanion.displayName = 'DetailCompanion';

const useRestoredNode = (path: string) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    AppGraph.expandPath(graph, path);
  }, [graph, path]);
  return useNode(graph, path);
};
