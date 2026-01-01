//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { ComputeGraph } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { CanvasBoardType } from '@dxos/react-ui-canvas-editor';

import { IntentResolver, OperationHandler, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const ConductorPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: CanvasBoardType.typename,
      metadata: {
        icon: 'ph--infinity--regular',
        iconHue: 'sky',
        createObject: ((props) => Effect.sync(() => Obj.make(CanvasBoardType, props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [CanvasBoardType, ComputeGraph] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.make,
);
