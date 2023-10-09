//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { Document } from '@braneframe/types';
import { useTextModel } from '@dxos/aurora-composer';
import { isTypedObject, SpaceProxy } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Surface } from '@dxos/react-surface';

export const isDocument = (data: unknown): data is Document => data instanceof Document;

export const SpaceMain: FC<{ data: unknown }> = ({ data }) => {
  const identity = useIdentity();
  const [parentNode, childNode] =
    data &&
    typeof data === 'object' &&
    'active' in data &&
    Array.isArray(data.active) &&
    isGraphNode(data.active[0]) &&
    isGraphNode(data.active[1])
      ? [data.active[0], data.active[1]]
      : [];

  // TODO(wittjosiah): Factor out.
  const textModel = useTextModel({
    identity,
    space: parentNode?.data instanceof SpaceProxy ? parentNode.data : undefined,
    text: childNode && isDocument(childNode.data) ? childNode.data.content : undefined,
  });

  const transformedData = textModel
    ? { composer: textModel, properties: childNode!.data }
    : parentNode?.data instanceof SpaceProxy
    ? isTypedObject(childNode?.data)
      ? { space: parentNode.data, object: childNode!.data }
      : childNode
      ? { space: parentNode.data, node: childNode }
      : { space: parentNode.data }
    : null;

  return <Surface data={transformedData} role='main' />;
};
