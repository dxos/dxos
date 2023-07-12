//
// Copyright 2023 DXOS.org
//

import { Article, ArticleMedium, Trash } from '@phosphor-icons/react';
import { getIndices } from '@tldraw/indices';

import { GraphNode } from '@braneframe/plugin-graph';
import { TextKind } from '@dxos/aurora-composer';
import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { EchoDatabase, Space, TypedObject, SpaceState } from '@dxos/react-client';
import { Plugin } from '@dxos/react-surface';

import { SpaceProvides } from './types';

export const SPACE_PLUGIN = 'dxos:space';

export const isSpace = (datum: unknown): datum is Space =>
  datum && typeof datum === 'object'
    ? 'key' in datum && datum.key instanceof PublicKey && 'db' in datum && datum.db instanceof EchoDatabase
    : false;

export const objectsToGraphNodes = (parent: GraphNode<Space>, objects: TypedObject[]): GraphNode[] => {
  const defaultIndices = getIndices(objects.length);
  return objects.map((obj, index) => ({
    id: obj.id,
    index: obj.meta?.index ?? defaultIndices[index],
    label: obj.title ?? 'Untitled',
    description: obj.description,
    icon: obj.content?.kind === TextKind.PLAIN ? ArticleMedium : Article,
    data: obj,
    parent,
    actions: [
      {
        id: 'delete',
        index: getIndices(0)[0],
        label: ['delete document label', { ns: 'composer' }],
        icon: Trash,
        invoke: async () => {
          parent.data?.db.remove(obj);
        },
      },
    ],
  }));
};

// TODO(wittjosiah): Specify and factor out fully qualified names + utils (e.g., subpaths, uris, etc).
export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.truncate();
  }

  return `${SPACE_PLUGIN}/${spaceKey}`;
};

type SpacePlugin = Plugin<SpaceProvides>;
export const spacePlugins = (plugins: Plugin[]): SpacePlugin[] => {
  return (plugins as SpacePlugin[]).filter((p) => Array.isArray(p.provides?.space?.types));
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: 'composer' }]
    : ['untitled space title', { ns: 'composer' }];
};
