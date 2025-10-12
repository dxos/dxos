//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type OnboardingManager } from '../onboarding-manager';

export namespace WelcomeCapabilities {
  export const Onboarding = defineCapability<OnboardingManager>(`${meta.id}/capability/onboarding`);
}
