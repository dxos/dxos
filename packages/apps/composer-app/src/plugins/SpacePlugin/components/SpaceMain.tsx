//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { useGraphContext } from '@braneframe/plugin-graph';
import { useTreeView } from '@braneframe/plugin-treeview';
import { Document } from '@braneframe/types';
import { useTextModel } from '@dxos/aurora-composer';
import { isTypedObject, SpaceProxy } from '@dxos/client';
import { observer } from '@dxos/observable-object/react';
import { useIdentity } from '@dxos/react-client';
import { Surface } from '@dxos/react-surface';

import { SpacePlugin } from '../SpacePlugin';

export const isDocument = (datum: unknown): datum is Document =>
  isTypedObject(datum) && Document.type.name === datum.__typename;

export const SpaceMain: FC<{}> = observer(() => {
  const identity = useIdentity();
  const treeView = useTreeView();
  const graph = useGraphContext();
  const [parentId, childId] = treeView.selected;

  const parentNode = graph.roots[SpacePlugin.meta.id].find((node) => node.id === parentId);
  const childNode = parentNode?.children?.find((node) => node.id === childId);

  const textModel = useTextModel({
    identity,
    space: parentNode?.data instanceof SpaceProxy ? parentNode.data : undefined,
    text: childNode && isDocument(childNode.data) ? childNode.data.content : undefined,
  });

  const data = textModel
    ? [textModel, childNode!.data]
    : parentNode
    ? childNode
      ? [parentNode.data, childNode.data]
      : [parentNode.data]
    : null;

  return <Surface data={data} role='main' />;
});
