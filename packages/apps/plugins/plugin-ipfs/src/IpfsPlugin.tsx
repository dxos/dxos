//
// Copyright 2023 DXOS.org
//

import { type IntentPluginProvides } from '@braneframe/plugin-intent';
import { GraphNodeAdapter } from '@braneframe/plugin-space';
import { findPlugin, type PluginDefinition } from '@dxos/app-framework';
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
      const intentPlugin = findPlugin<IntentPluginProvides>(plugins, 'dxos.org/plugin/intent');
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
        nodes: (parent) => {
          if (!(parent.data instanceof SpaceProxy)) {
            return;
          }

          const space = parent.data;

          return adapter?.createNodes(space, parent);
        },
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object' || !isFile(data)) {
          return null;
        }

        switch (role) {
          case 'main':
            return FileMain;
          case 'section':
            return FileSection;
          case 'presenter-slide':
            return FileSlide;
        }

        return null;
      },
    },
  };
};
