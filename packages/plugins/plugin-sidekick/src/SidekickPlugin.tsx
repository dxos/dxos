//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { BlueprintDefinition, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Profile, Sidekick } from '#types';

import { translations } from './translations';

export default Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sidekick.Profile.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Sidekick.Profile).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Sidekick.Profile).pipe(Option.getOrThrow).hue ?? 'white',
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Sidekick.Profile, Profile.Profile] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
