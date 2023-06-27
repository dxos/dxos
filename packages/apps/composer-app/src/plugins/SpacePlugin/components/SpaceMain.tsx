//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { Document } from '@braneframe/types';
import { useTextModel } from '@dxos/aurora-composer';
import { isTypedObject, SpaceProxy } from '@dxos/client';
import { observer } from '@dxos/observable-object/react';
import { useIdentity } from '@dxos/react-client';
import { Surface } from '@dxos/react-surface';

export const isDocument = (datum: unknown): datum is Document =>
  isTypedObject(datum) && Document.type.name === datum.__typename;

export const SpaceMain: FC<{ data: unknown }> = observer(({ data }) => {
  const [parentNode, childNode] = Array.isArray(data) && isGraphNode(data[0]) && isGraphNode(data[1]) ? data : [];
  const identity = useIdentity();

  const textModel = useTextModel({
    identity,
    space: parentNode?.data instanceof SpaceProxy ? parentNode.data : undefined,
    text: childNode && isDocument(childNode.data) ? childNode.data.content : undefined,
  });

  const transformedData = textModel
    ? [textModel, childNode!.data]
    : parentNode
    ? childNode
      ? [parentNode.data, childNode.data]
      : [parentNode.data]
    : null;

  return <Surface data={transformedData} role='main' />;
});
