//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation, Type } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
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
        createObject: ((props, { db }) =>
          Effect.promise(async () => {
            const { view } = await ViewModel.makeFromDatabase({ db, typename: props.typename });
            return Masonry.make({ name: props.name, view });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Masonry.Masonry] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
