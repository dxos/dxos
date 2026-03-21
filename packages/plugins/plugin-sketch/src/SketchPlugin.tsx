//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { type CreateObject, SpaceOperation } from '@dxos/plugin-space/types';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphSerializer, OperationResolver, ReactSurface, SketchSettings } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Sketch } from './types';
import { serializer } from './util';

export const SketchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sketch.Sketch.typename,
      metadata: {
        icon: 'ph--compass-tool--regular',
        iconHue: 'indigo',
        // TODO(wittjosiah): Move out of metadata.
        loadReferences: async (sketch: Sketch.Sketch) => await RefArray.loadAll([sketch.canvas]),
        serializer,
        comments: 'unanchored',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Sketch.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Sketch.Canvas, Sketch.Sketch] }),
  AppPlugin.addSettingsModule({ activate: SketchSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.make,
);
