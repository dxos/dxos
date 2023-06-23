//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { useGraphContext } from '@braneframe/plugin-graph';
import { useTreeView } from '@braneframe/plugin-treeview';
import { observer } from '@dxos/observable-object/react';
import { Surface } from '@dxos/react-surface';

import { LocalFilesPlugin } from '../LocalFilesPlugin';
import { LocalFileMainPermissions } from './LocalFileMainPermissions';

export const LocalFileMain = observer(() => {
  const treeView = useTreeView();
  const graph = useGraphContext();
  const [parentId, childId] = treeView.selected;

  const parentNode = graph.roots[LocalFilesPlugin.meta.id].find((node) => node.id === parentId);
  const childNode = parentNode?.children?.find((node) => node.id === childId);
  const node = childNode ?? parentNode;
  const data = useMemo(
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
    [node?.data],
  );

  return <Surface role='main' data={data} />;
});
