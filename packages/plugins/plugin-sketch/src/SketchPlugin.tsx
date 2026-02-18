//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { RefArray } from '@dxos/react-client/echo';

import { AppGraphSerializer, OperationResolver, ReactSurface, SketchSettings } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Diagram, SketchOperation } from './types';
import { serializer } from './util';

export const SketchPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Diagram.Diagram.typename,
      metadata: {
        icon: 'ph--compass-tool--regular',
        iconHue: 'indigo',
        // TODO(wittjosiah): Move out of metadata.
        loadReferences: async (diagram: Diagram.Diagram) => await RefArray.loadAll([diagram.canvas]),
        serializer,
        comments: 'unanchored',
        createObject: ((props) => Effect.sync(() => Diagram.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Diagram.Canvas, Diagram.Diagram] }),
  AppPlugin.addSettingsModule({ activate: SketchSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(SketchOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.addModule({
    id: 'app-graph-serializer',
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: AppGraphSerializer,
  }),
  Plugin.make,
);
