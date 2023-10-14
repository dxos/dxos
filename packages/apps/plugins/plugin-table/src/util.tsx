//
// Copyright 2023 DXOS.org
//

import { Table } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { type Node } from '@braneframe/plugin-graph';
import { type Space, type TypedObject } from '@dxos/client/echo';

import { TABLE_PLUGIN } from './types';

export const objectToGraphNode = (parent: Node<Space>, object: TypedObject, index: string): Node<TypedObject> => {
  const [child] = parent.addNode(TABLE_PLUGIN, {
    id: object.id,
    label: object.title ?? ['object placeholder', { ns: TABLE_PLUGIN }],
    icon: (props) => <Table {...props} />,
    data: object,
    properties: {
      index: get(object, 'meta.index', index),
      persistenceClass: 'spaceObject',
    },
  });

  return child;
};
