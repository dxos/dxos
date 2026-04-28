//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { AutoSync } from '#capabilities';
import { meta } from '#meta';
import { Linear } from '#types';

import { translations } from './translations';

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
  Plugin.addModule({
    id: 'auto-sync',
    activatesOn: ActivationEvents.Startup,
    activate: AutoSync,
  }),
  Plugin.make,
);
