//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';

import { AppGraphBuilder, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Journal, Outline, OutlinerOperation } from './types';

export const OutlinerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Journal.Journal.typename,
        metadata: {
          icon: 'ph--calendar-check--regular',
          iconHue: 'indigo',
          createObject: ((props) => Effect.sync(() => Journal.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Outline.Outline.typename,
        metadata: {
          icon: 'ph--tree-structure--regular',
          iconHue: 'indigo',
          createObject: ((props) => Effect.sync(() => Outline.make(props))) satisfies CreateObject,
        },
      },
    ],
  }),
  Common.Plugin.addSchemaModule({
    schema: [Journal.JournalEntry, Journal.Journal, Outline.Outline],
  }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(OutlinerOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.make,
);
