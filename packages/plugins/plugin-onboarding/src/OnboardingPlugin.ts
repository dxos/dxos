//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';
import { SpaceEvents } from '@dxos/plugin-space';

import {
  AppGraphBuilder,
  DefaultContent,
  OAuthRecoveryRedirect,
  Onboarding,
  type OnboardingOptions,
  OperationHandler,
  ReactSurface,
  Settings,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const OnboardingPlugin = Plugin.define<OnboardingOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSettingsModule({ activate: Settings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'oauth-recovery-redirect',
    activatesOn: ActivationEvents.Startup,
    activate: OAuthRecoveryRedirect,
  }),
  Plugin.addModule((options) => ({
    id: 'default-content',
    activatesOn: SpaceEvents.PersonalSpaceReady,
    activate: () => DefaultContent(options),
  })),
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

export default OnboardingPlugin;
