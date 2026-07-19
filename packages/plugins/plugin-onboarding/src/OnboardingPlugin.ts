//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(Settings),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations(translations)),
  Plugin.addLazyModule(OAuthRecoveryRedirect, { id: 'oauth-recovery-redirect' }),
  Plugin.addLazyModule(DefaultContent, { id: 'default-content' }),
  Plugin.addLazyModule(Onboarding, { id: 'onboarding' }),
  Plugin.make,
);

export default OnboardingPlugin;
