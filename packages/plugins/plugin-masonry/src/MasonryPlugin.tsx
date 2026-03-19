//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject, SpaceOperation } from '@dxos/plugin-space/types';
import { ViewModel } from '@dxos/schema';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Masonry, MasonryAction } from './types';

export const MasonryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Masonry.Masonry),
      metadata: {
        icon: Annotation.IconAnnotation.get(Masonry.Masonry).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Masonry.Masonry).pipe(Option.getOrThrow).hue ?? 'white',
        inputSchema: MasonryAction.MasonryProps,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = yield* Effect.promise(async () => {
              const { view } = await ViewModel.makeFromDatabase({ db: options.db, typename: props.typename });
              return Masonry.make({ name: props.name, view });
            });
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
  AppPlugin.addSchemaModule({ schema: [Masonry.Masonry] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
