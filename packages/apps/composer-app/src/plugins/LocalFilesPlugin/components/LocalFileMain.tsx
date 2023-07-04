//
// Copyright 2023 DXOS.org
//

import React, { FC, useMemo } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

import { LocalFileMainPermissions } from './LocalFileMainPermissions';

export const LocalFileMain: FC<{ data: unknown }> = observer(({ data }) => {
  const [parentNode, childNode] = Array.isArray(data) && isGraphNode(data[0]) ? data : [];
  const node = childNode ?? parentNode;
  const transformedData = useMemo(
    () =>
      node?.attributes?.disabled
        ? [
            { id: node.id, content: () => <LocalFileMainPermissions data={node} /> },
            { title: node.data.title, readOnly: true },
          ]
        : node?.data?.text
        ? [
            { id: node.id, content: node.data.text },
            { title: node.data.title, readOnly: true },
          ]
        : node?.data
        ? node.data
        : null,
    [node?.id, Boolean(node?.data?.text)],
  );

  return <Surface role='main' data={transformedData} />;
});
