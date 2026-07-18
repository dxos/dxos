//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

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
  AppPlugin.addAppGraphModule<OnboardingOptions>({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule<OnboardingOptions>({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSettingsModule<OnboardingOptions>({
    requires: Settings.requires,
    provides: Settings.provides,
    activate: Settings,
  }),
  AppPlugin.addSurfaceModule<OnboardingOptions>({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule<OnboardingOptions>({ translations }),
  Plugin.addModule({
    id: 'oauth-recovery-redirect',
    requires: OAuthRecoveryRedirect.requires,
    provides: OAuthRecoveryRedirect.provides,
    activate: OAuthRecoveryRedirect,
  }),
  // Runtime event: the personal space exists once identity is created, not at startup.
  // `requires: [SpaceCapabilities.PersonalSpace]` orders this after plugin-space's
  // `IdentityCreated` module within the same event wave.
  Plugin.addModule((options: OnboardingOptions) => ({
    id: 'default-content',
    activatesOn: ClientEvents.IdentityCreated,
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
