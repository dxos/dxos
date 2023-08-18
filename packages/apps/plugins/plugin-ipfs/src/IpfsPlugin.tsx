//
// Copyright 2023 DXOS.org
//

import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { SpaceProxy, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { FileMain, FileSection } from './components';
import translations from './translations';
import { isObject, IPFS_PLUGIN, IpfsPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  const adapter = new GraphNodeAdapter((object: TypedObject) => isObject(object), objectToGraphNode);

  return {
    meta: {
      id: IPFS_PLUGIN,
    },
    unload: async () => {
      adapter.clear();
    },
    provides: {
      translations,
      graph: {
        nodes: (parent, emit) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          const space = parent.data;
          return adapter.createNodes(space, parent, emit);
        },
      },
      component: (data, role) => {
        if (!(data && typeof data === 'object' && 'object' in data && isObject(data.object))) {
          return null;
        }

        switch (role) {
          case 'main': {
            return FileMain;
          }

          case 'section': {
            return FileSection;
          }
        }

        return null;
      },
    },
  };
};
