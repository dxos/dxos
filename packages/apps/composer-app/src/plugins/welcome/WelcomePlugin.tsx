//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import { AppGraphBuilder, DefaultContent, OAuthRecoveryRedirect, Onboarding, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const WelcomePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'oauth-recovery-redirect',
    activatesOn: ActivationEvents.Startup,
    activate: OAuthRecoveryRedirect,
  }),
  Plugin.addModule({
    id: 'default-content',
    activatesOn: SpaceEvents.PersonalSpaceReady,
    activate: DefaultContent,
  }),
  Plugin.addModule({
    id: 'onboarding',
    activatesOn: ActivationEvent.allOf(
      AppActivationEvents.AppGraphReady,
      ActivationEvents.ProcessManagerReady,
      AppActivationEvents.LayoutReady,
      ClientEvents.ClientReady,
    ),
    activate: Onboarding,
  }),
  Plugin.make,
);
