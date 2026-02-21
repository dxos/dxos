//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { View } from '@dxos/schema';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ExplorerAction, Graph } from './types';

export const ExplorerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Graph.Graph),
      metadata: {
        icon: 'ph--graph--regular',
        iconHue: 'green',
        inputSchema: ExplorerAction.GraphProps,
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const { view } = await View.makeFromDatabase({ db, typename: props.typename });
            return Graph.make({ name: props.name, view });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Graph.Graph] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
