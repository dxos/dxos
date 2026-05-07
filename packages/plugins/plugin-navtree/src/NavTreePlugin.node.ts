//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, OperationHandler } from '#capabilities';
import { meta } from '#meta';

const NODE_TYPE = 'dxos/app-graph/node';

export const NavTreePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: NODE_TYPE,
      metadata: {
        parse: ({ item }: TreeData, type: string) => {
          switch (type) {
            case 'node':
              return item;
            case 'object':
              return item.data;
            case 'view-object':
              return { id: `${item.id}-view`, object: item.data };
          }
        },
      },
    },
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.make,
);

export default NavTreePlugin;
