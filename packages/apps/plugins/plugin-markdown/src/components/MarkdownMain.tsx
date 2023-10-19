//
// Copyright 2023 DXOS.org
//

import React, { type FC } from 'react';

import { isGraphNode } from '@braneframe/plugin-graph';
import { type SpacePluginProvides } from '@braneframe/plugin-space';
import { Document } from '@braneframe/types';
import { isTypedObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { findPlugin, Surface, usePlugins } from '@dxos/react-surface';
import { useTextModel } from '@dxos/react-ui-composer';

export const isDocument = (data: unknown): data is Document =>
  isTypedObject(data) && Document.schema.typename === data.__typename;

export const MarkdownMain: FC<{ data: unknown }> = ({ data }) => {
  const node = data && typeof data === 'object' && 'active' in data && isGraphNode(data.active) ? data.active : null;
  const document = node && isDocument(node.data) ? node.data : undefined;

  const identity = useIdentity();
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');

  const textModel = useTextModel({
    identity,
    space: spacePlugin?.provides.space.active,
    text: document?.content,
  });

  // Fall back to other surfaces to handle.
  if (!document) {
    return <Surface data={data} role='main' />;
  }

  return <Surface data={{ composer: textModel, properties: node?.data }} role='main' />;
};
