//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';

import { OnboardingNamespace } from '../namespace.ts';
import type { OnboardingManager } from '../onboarding-manager.ts';

export type OnboardingOptions = {
  generateDemoSpace: boolean;
};

export namespace OnboardingCapabilities {
  export const Onboarding = Capability.makeSingleton<OnboardingManager>()(
    `${OnboardingNamespace.key}.capability.onboarding`,
  );
}
