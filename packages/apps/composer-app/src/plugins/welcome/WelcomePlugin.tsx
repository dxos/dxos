//
// Copyright 2025 DXOS.org
//

import { allOf, Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { DefaultContent, Onboarding, ReactSurface } from './capabilities';
import { WELCOME_PLUGIN, meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${WELCOME_PLUGIN}/module/onboarding`,
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
      id: `${WELCOME_PLUGIN}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${WELCOME_PLUGIN}/module/react-surface`,
      activatesOn: Events.SetupReactSurface,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${WELCOME_PLUGIN}/module/default-content`,
      activatesOn: SpaceEvents.DefaultSpaceReady,
      activate: DefaultContent,
    }),
  ]);
