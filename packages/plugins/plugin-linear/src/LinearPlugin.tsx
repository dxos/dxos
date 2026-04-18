//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { meta } from './meta';
import { translations } from './translations';
import { Linear } from './types';

export const LinearPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Linear.LinearTeam.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Linear.LinearTeam).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Linear.LinearTeam).pipe(Option.getOrThrow).hue ?? 'violet',
        },
      },
      {
        id: Linear.LinearWorkspace.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Linear.LinearWorkspace).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Linear.LinearWorkspace).pipe(Option.getOrThrow).hue ?? 'violet',
        },
      },
    ],
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
