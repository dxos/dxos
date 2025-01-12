//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { WELCOME_PLUGIN } from '../meta';
import { type OnboardingManager } from '../onboarding-manager';

export namespace WelcomeCapabilities {
  export const Onboarding = defineCapability<OnboardingManager>(`${WELCOME_PLUGIN}/capability/onboarding`);
}
