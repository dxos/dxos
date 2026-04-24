//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { AppGraphBuilder, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Trello } from '#types';

import { translations } from './translations';

export const TrelloPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Trello.TrelloBoard.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Trello.TrelloBoard).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Trello.TrelloBoard).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: Trello.CreateTrelloBoardSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Trello.makeBoard(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Trello.TrelloCard.typename,
        metadata: {
          label: (object: Trello.TrelloCard) => object.name,
          icon: Annotation.IconAnnotation.get(Trello.TrelloCard).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Trello.TrelloCard).pipe(Option.getOrThrow).hue ?? 'white',
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Trello.TrelloBoard, Trello.TrelloCard],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
