//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Masonry, MasonryAction } from './types';

export const MasonryPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Masonry.Masonry),
      metadata: {
        icon: 'ph--wall--regular',
        iconHue: 'green',
        inputSchema: MasonryAction.MasonryProps,
        createObject: ((props) => Effect.sync(() => Masonry.make(props))) satisfies CreateObject,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Masonry.Masonry] }),
  Plugin.make,
);
