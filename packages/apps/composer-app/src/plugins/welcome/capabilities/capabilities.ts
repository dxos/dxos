//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type OnboardingManager } from '../onboarding-manager';

export namespace WelcomeCapabilities {
  export const Onboarding = Capability.make<OnboardingManager>(`${meta.id}/capability/onboarding`);
}
