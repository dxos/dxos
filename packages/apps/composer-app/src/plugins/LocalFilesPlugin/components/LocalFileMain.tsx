//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { observer } from '@dxos/observable-object/react';
import { Surface, useGraphContext, useTreeView } from '@dxos/react-surface';

import { LocalFilesPlugin } from '../LocalFilesPlugin';

export const LocalFileMain = observer(() => {
  const treeView = useTreeView();
  const graph = useGraphContext();
  const [parentId, childId] = treeView.selected;

  const parentNode = graph.roots[LocalFilesPlugin.meta.id].find((node) => node.id === parentId);
  const childNode = parentNode?.children?.find((node) => node.id === childId);
  const node = childNode ?? parentNode;
  const data = node?.data?.text
    ? [
        { id: node.id, content: node.data.text },
        { title: node.data.title, readOnly: true },
      ]
    : node?.data
    ? node.data
    : null;

  if (parentNode?.attributes?.disabled) {
    return <Surface role='main' data={parentNode} />;
  }

  return <Surface role='main' data={data} />;
});
