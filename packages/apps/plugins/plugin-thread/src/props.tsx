//
// Copyright 2023 DXOS.org
//

import { Chat, Trash } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { GraphNode, GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { SpaceAction } from '@braneframe/plugin-space';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Thread as ThreadType } from '@braneframe/types';
import { isTypedObject } from '@dxos/react-client/echo';

export const THREAD_PLUGIN = 'dxos.org/plugin/thread';

export enum ThreadAction {
  CREATE = `${THREAD_PLUGIN}/create`,
}

export type ThreadPluginProvides = GraphProvides & IntentProvides & TranslationsProvides;

export interface ThreadModel {
  root: ThreadType;
}

export const isThread = (datum: unknown): datum is ThreadType => {
  return isTypedObject(datum) && ThreadType.type.name === datum.__typename;
};

export const threadToGraphNode = (parent: GraphNode, object: ThreadType, index: string): GraphNode => ({
  id: object.id,
  index: get(object, 'meta.index', index), // TODO(burdon): Data should not be on object?
  label: object.title ?? ['thread title placeholder', { ns: THREAD_PLUGIN }],
  icon: (props) => <Chat {...props} />,
  data: object,
  parent,
  pluginActions: {
    [THREAD_PLUGIN]: [
      {
        id: 'delete', // TODO(burdon): Namespace.
        index: 'a1',
        label: ['delete thread label', { ns: THREAD_PLUGIN }],
        icon: (props) => <Trash {...props} />,
        intent: {
          action: SpaceAction.REMOVE_OBJECT,
          data: { spaceKey: parent.data?.key.toHex(), objectId: object.id },
        },
      },
    ],
  },
});
