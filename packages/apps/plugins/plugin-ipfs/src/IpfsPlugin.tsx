//
// Copyright 2023 DXOS.org
//

import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { SpaceProxy, Expando, TypedObject } from '@dxos/client/echo';
import { PluginDefinition } from '@dxos/react-surface';

import { FileMain } from './components';
import translations from './translations';
import { isObject, IPFS_PLUGIN, IpfsAction, IpfsPluginProvides } from './types';
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
        actions: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return [];
          }

          return [];
        },
      },
      component: (datum, role) => {
        if (!datum || typeof datum !== 'object') {
          return null;
        }

        switch (role) {
          case 'main': {
            if ('object' in datum && isObject(datum.object)) {
              return FileMain;
            }
          }
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case IpfsAction.CREATE: {
              // TODO(burdon): Set typename.
              return { object: new Expando({ type: 'template' }) };
            }
          }
        },
      },
    },
  };
};
