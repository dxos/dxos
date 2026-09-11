//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import {
  AppGraphBuilder,
  DefaultContent,
  OAuthRecoveryRedirect,
  Onboarding,
  type OnboardingOptions,
  OperationHandler,
  ReactSurface,
  Settings,
  Translations,
} from '#capabilities';

import { meta } from './meta.ts';

export const OnboardingPlugin = Plugin.define<OnboardingOptions>(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(DefaultContent),
  Plugin.addModule(OAuthRecoveryRedirect),
  Plugin.addModule(Onboarding),
  Plugin.addModule(OperationHandler),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(Settings),
  Plugin.addModule(Translations),
  Plugin.make,
);

export default OnboardingPlugin;
