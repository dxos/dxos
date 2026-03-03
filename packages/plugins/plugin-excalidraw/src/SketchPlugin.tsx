//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Diagram } from '@dxos/plugin-sketch/types';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Diagram.Diagram.typename,
      metadata: {
        icon: 'ph--compass-tool--regular',
        iconHue: 'indigo',
        createObject: ((props) => Effect.sync(() => Diagram.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Diagram.Canvas, Diagram.Diagram] }),
  AppPlugin.addSettingsModule({ id: 'settings', activate: ExcalidrawSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
