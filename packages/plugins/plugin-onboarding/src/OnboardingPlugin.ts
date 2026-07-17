//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
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
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSettingsModule({ requires: Settings.requires, provides: Settings.provides, activate: Settings }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'oauth-recovery-redirect',
    requires: OAuthRecoveryRedirect.requires,
    provides: OAuthRecoveryRedirect.provides,
    activate: OAuthRecoveryRedirect,
  }),
  // Migration bridge: `SpaceEvents.PersonalSpaceReady` still fires via plugin-space's
  // legacy compat window until this module's consumer is fully event-free.
  Plugin.addModule((options) => ({
    id: 'default-content',
    activatesOn: SpaceEvents.PersonalSpaceReady,
    requires: DefaultContent.requires,
    provides: DefaultContent.provides,
    activate: () => DefaultContent(options),
  })),
  Plugin.addModule({
    id: 'onboarding',
    requires: Onboarding.requires,
    provides: Onboarding.provides,
    activate: Onboarding,
  }),
  Plugin.make,
);

export default OnboardingPlugin;
