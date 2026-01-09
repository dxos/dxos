//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { DefaultContent, Onboarding, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/onboarding`,
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.AppGraphReady,
      Common.ActivationEvent.OperationInvokerReady,
      Common.ActivationEvent.LayoutReady,
      Common.ActivationEvent.SettingsReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Effect.succeed(Capability.contributes(Common.Capability.Translations, translations)),
  }),
  Plugin.addModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/default-content`,
    activatesOn: SpaceEvents.DefaultSpaceReady,
    activate: DefaultContent,
  }),
  Plugin.make,
);
