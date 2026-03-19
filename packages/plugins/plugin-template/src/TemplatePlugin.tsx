//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Template } from './types';

export const TemplatePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Template.Data.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Template.Data).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Template.Data).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props) => Effect.sync(() => Template.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Template.Data] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
