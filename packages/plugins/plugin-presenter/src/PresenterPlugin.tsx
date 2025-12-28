//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability } from '@dxos/app-framework';

import { AppGraphBuilder, PresenterSettings, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: Events.SetupSettings,
    activate: PresenterSettings,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
