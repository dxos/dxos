//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { DefaultContent, Onboarding, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: `${meta.id}/module/onboarding`,
    activatesOn: ActivationEvent.allOf(
      AppActivationEvents.AppGraphReady,
      ActivationEvents.OperationInvokerReady,
      AppActivationEvents.LayoutReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/translations`,
    activatesOn: AppActivationEvents.SetupTranslations,
    activate: () => Effect.succeed(Capability.contributes(AppCapabilities.Translations, translations)),
  }),
  Plugin.addModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: `${meta.id}/module/default-content`,
    activatesOn: SpaceEvents.DefaultSpaceReady,
    activate: DefaultContent,
  }),
  Plugin.make,
);
