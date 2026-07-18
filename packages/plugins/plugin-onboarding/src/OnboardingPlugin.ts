//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(OAuthRecoveryRedirect, { id: 'oauth-recovery-redirect' }),
  Plugin.addLazyModule(DefaultContent, { id: 'default-content' }),
  Plugin.addLazyModule(Onboarding, { id: 'onboarding' }),
  Plugin.make,
);

export default OnboardingPlugin;
