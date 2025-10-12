//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { AppGraphBuilder, PresenterSettings, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/settings`,
    activatesOn: Events.SetupSettings,
    activate: PresenterSettings,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
]);
