//
// Copyright 2023 DXOS.org
//

import { Table } from '@phosphor-icons/react';
import get from 'lodash.get';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { Space, TypedObject } from '@dxos/client/echo';

import { TABLE_PLUGIN } from './types';

export const objectToGraphNode = (
  parent: Graph.Node<Space>,
  object: TypedObject,
  index: string,
): Graph.Node<TypedObject> => {
  const [child] = parent.add({
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
