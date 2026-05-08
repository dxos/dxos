//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';

import { BlueprintDefinition, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Sidekick } from '#types';

export const SidekickPlugin = Plugin.define(meta).pipe(
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
  // Note: `types/Profile.ts` declares a second schema with the same typename
  // (`org.dxos.type.sidekick.profile@0.1.0`) and a different shape. Registering
  // it alongside Sidekick.Profile triggers `Schema version already registered`,
  // which leaves the page in a broken state and times out subsequent clicks.
  // The Profile.Profile schema is otherwise unreferenced — Sidekick.Profile is
  // the canonical type — so we leave it out of the registry here.
  AppPlugin.addSchemaModule({ schema: [Sidekick.Profile] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default SidekickPlugin;
