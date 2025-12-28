//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Capabilities, Capability, Events, Plugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { DefaultContent, Onboarding, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/onboarding`,
    activatesOn: ActivationEvent.allOf(
      Events.DispatcherReady,
      Events.AppGraphReady,
      Events.SettingsReady,
      Events.LayoutReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/default-content`,
    activatesOn: SpaceEvents.DefaultSpaceReady,
    activate: DefaultContent,
  }),
  Plugin.make,
);
