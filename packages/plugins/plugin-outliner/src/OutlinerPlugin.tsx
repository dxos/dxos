//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';

import { AppGraphBuilder, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Journal, Outline } from './types';

export const OutlinerPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Journal.Journal.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Journal.Journal).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Journal.Journal).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props) => Effect.sync(() => Journal.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Outline.Outline.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Outline.Outline).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Outline.Outline).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props) => Effect.sync(() => Outline.make(props))) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Journal.JournalEntry, Journal.Journal, Outline.Outline],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
