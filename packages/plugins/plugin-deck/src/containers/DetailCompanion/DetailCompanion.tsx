//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { useNode } from '@dxos/plugin-graph/Hooks';

import { useNodeActionExpander } from '#hooks';

export type DetailCompanionProps = {
  role: string;
  attendableId: string;
  detail: string;
};

export const DetailCompanion = ({ role, attendableId, detail }: DetailCompanionProps) => {
  const node = useRestoredNode(detail);
  useNodeActionExpander(node);
  const data = useMemo<AppSurface.ArticleData | undefined>(
    () => node && { attendableId, nodeId: node.id, subject: node.data, properties: node.properties },
    [attendableId, node],
  );
  if (!data) {
    return null;
  }

  return <Surface.Surface key={detail} type={AppSurface.Article} role={role} data={data} limit={1} />;
};

DetailCompanion.displayName = 'DetailCompanion';

const useRestoredNode = (path: string) => {
  const { graph } = useAppGraph();
  useEffect(() => {
    AppGraph.expandPath(graph, path);
  }, [graph, path]);
  return useNode(graph, path);
};
