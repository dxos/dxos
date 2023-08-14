//
// Copyright 2023 DXOS.org
//

import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { SpaceProxy, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { FileDrop, FileMain } from './components';
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
      component: (datum, role) => {
        switch (role) {
          case 'main': {
            if (datum && typeof datum === 'object' && 'object' in datum && isObject(datum.object)) {
              return FileMain;
            }
            break;
          }

          case 'drop': {
            return FileDrop;
          }
        }

        return null;
      },
    },
  };
};
