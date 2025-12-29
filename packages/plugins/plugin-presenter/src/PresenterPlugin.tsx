//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, PresenterSettings, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: PresenterSettings,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Common.ActivationEvent.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.make,
);
