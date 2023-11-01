//
// Copyright 2023 DXOS.org
//

import { Asterisk } from '@phosphor-icons/react';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type Space, type TypedObject } from '@dxos/client/echo';

import { TEMPLATE_PLUGIN } from './types';

// TODO(burdon): Anti-pattern to have util.ts?
// TODO(burdon): Generic "object" var name?
export const objectToGraphNode = (parent: Node<Space>, object: TypedObject): Node<TypedObject> => {
  const [child] = parent.addNode(TEMPLATE_PLUGIN, {
    id: object.id,
    label: object.title || ['object title placeholder', { ns: TEMPLATE_PLUGIN }],
    icon: (props) => <Asterisk {...props} />,
    data: object,
    properties: {
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
