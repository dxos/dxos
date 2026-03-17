//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { ViewModel } from '@dxos/schema';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ExplorerAction, Graph } from './types';

export const ExplorerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Graph.Graph),
      metadata: {
        icon: Annotation.IconAnnotation.get(Graph.Graph).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Graph.Graph).pipe(Option.getOrThrow).hue ?? 'white',
        inputSchema: ExplorerAction.GraphProps,
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const { view } = await ViewModel.makeFromDatabase({ db, typename: props.typename });
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
