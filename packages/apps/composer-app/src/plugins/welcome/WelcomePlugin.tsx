//
// Copyright 2025 DXOS.org
//

import { Capabilities, Events, allOf, contributes, defineModule, definePlugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { DefaultContent, Onboarding, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/onboarding`,
    activatesOn: allOf(
      Events.DispatcherReady,
      Events.AppGraphReady,
      Events.SettingsReady,
      Events.LayoutReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
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
    id: `${meta.id}/module/default-content`,
    activatesOn: SpaceEvents.DefaultSpaceReady,
    activate: DefaultContent,
  }),
]);
