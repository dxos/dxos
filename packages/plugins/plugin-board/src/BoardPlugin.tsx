//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
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
        icon: Annotation.IconAnnotation.get(Board.Board).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Board.Board).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Board.makeBoard(props);
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
  AppPlugin.addSchemaModule({ schema: [Board.Board] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...boardTranslations] }),
  Plugin.make,
);
