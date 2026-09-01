//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '../meta.ts';
import { type OnboardingManager } from '../onboarding-manager.ts';

export type OnboardingOptions = {
  generateExemplarSpace: boolean;
};

export namespace OnboardingCapabilities {
  export const Onboarding = Capability.makeSingleton<OnboardingManager>()(`${meta.profile.key}.capability.onboarding`);
}
