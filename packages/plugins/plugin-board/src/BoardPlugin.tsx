//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';
import { translations as boardTranslations } from '@dxos/react-ui-board';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Board } from './types';

export const BoardPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Board.Board.typename,
      metadata: {
        icon: 'ph--squares-four--regular',
        iconHue: 'green',
        createObject: ((props) => Effect.sync(() => Board.makeBoard(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Board.Board] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...boardTranslations] }),
  Plugin.make,
);
