//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { Surface } from '@dxos/react-surface';

import { LocalFileMainPermissions } from './LocalFileMainPermissions';

export const LocalFileMain: FC<{ data: unknown }> = ({ data }) => {
  const [parentNode, childNode] =
    data && typeof data === 'object' && 'active' in data && Array.isArray(data.active) && isGraphNode(data.active[0])
      ? [data.active[0], data.active[1]]
      : [];
  const node = childNode ?? parentNode;
  const transformedData = useMemo(
    () =>
      node?.attributes?.disabled
        ? {
            composer: { id: node.id, content: () => <LocalFileMainPermissions data={node} /> },
            properties: { title: node.data.title, readOnly: true },
          }
        : node?.data?.text
        ? {
            composer: { id: node.id, content: node.data.text },
            properties: { title: node.data.title, readOnly: true },
          }
        : node?.data
        ? node.data
        : null,
    [node?.id, Boolean(node?.data?.text)],
  );

  return <Surface role='main' data={transformedData} />;
};
