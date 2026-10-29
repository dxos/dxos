//
// Copyright 2026 DXOS.org
//

import { OnboardingNamespace } from './namespace.ts';

/**
 * Surface keys, apart from the components they address: the onboarding manager and app-graph
 * builder run in every tab and only need the identifiers, so importing them must not pull the
 * dialog implementations into the resident set.
 */
export const WELCOME_SCREEN = `${OnboardingNamespace.key}.component.welcome-screen`;

export const AUTHORIZING_DEVICE_DIALOG = `${OnboardingNamespace.key}.component.authorizing-device-dialog`;

export const NATIVE_REDIRECT_DIALOG = `${OnboardingNamespace.key}.component.native-redirect-dialog`;

export const BRAMBLE_TEMPLATE_ID = `${OnboardingNamespace.key}.template.bramble`;
