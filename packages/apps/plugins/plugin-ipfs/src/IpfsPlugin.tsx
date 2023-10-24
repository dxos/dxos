//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin } from '@dxos/app-framework';
import { SpaceProxy, type TypedObject } from '@dxos/client/echo';

import { FileMain, FileSection, FileSlide } from './components';
import translations from './translations';
import { isFile, IPFS_PLUGIN, type IpfsPluginProvides } from './types';
import { objectToGraphNode } from './util';

export const IpfsPlugin = (): PluginDefinition<IpfsPluginProvides> => {
  let adapter: GraphNodeAdapter<TypedObject> | undefined;

  return {
    meta: {
      id: IPFS_PLUGIN,
    },
    ready: async (plugins) => {
      // TODO(wittjosiah): Replace? Remove?
      // const dndPlugin = findPlugin<DndPluginProvides>(plugins, 'dxos.org/plugin/dnd');
      // if (dndPlugin && dndPlugin.provides.dnd?.onSetTileSubscriptions) {
      //   dndPlugin.provides.dnd.onSetTileSubscriptions.push((tile, node) => {
      //     if (isFile(node.data)) {
      //       tile.copyClass = (tile.copyClass ?? new Set()).add('stack-section');
      //     }
      //     return tile;
      //   });
      // }
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (dispatch) {
        adapter = new GraphNodeAdapter({
          dispatch,
          filter: (object: TypedObject) => isFile(object),
          adapter: objectToGraphNode,
        });
      }
    },
    unload: async () => {
      adapter?.clear();
    },
    provides: {
      translations,
      graph: {
        builder: ({ parent }) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;
          return adapter?.createNodes(space, parent);
        },
      },
      surface: {
        component: (data, role) => {
          switch (role) {
            case 'main':
              return isFile(data.active) ? <FileMain file={data.active} /> : null;
            case 'section':
              return isFile(data.object) ? <FileSection file={data.object} /> : null;
            case 'presenter-slide':
              return isFile(data.slide) ? <FileSlide file={data.slide} /> : null;
            default:
              return null;
          }
        },
      },
    },
  };
};
