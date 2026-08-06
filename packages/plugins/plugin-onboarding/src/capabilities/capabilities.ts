//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '../meta';
import { type OnboardingManager } from '../onboarding-manager';

export type OnboardingOptions = {
  generateExemplarSpace: boolean;
};

export namespace OnboardingCapabilities {
  export const Onboarding = Capability.makeSingleton<OnboardingManager>()(`${meta.profile.key}.capability.onboarding`);
}
