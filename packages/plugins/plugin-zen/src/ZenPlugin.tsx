//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Dream } from './types';

export const ZenPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Dream.Dream.typename,
      metadata: {
        icon: 'ph--moon-stars--regular',
        iconHue: 'violet',
        createObject: ((props) => Effect.sync(() => Dream.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Dream.Dream] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
