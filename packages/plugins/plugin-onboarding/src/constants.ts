//
// Copyright 2026 DXOS.org
//

import { meta } from './meta.ts';

/**
 * Surface keys, apart from the components they address: the onboarding manager and app-graph
 * builder run in every tab and only need the identifiers, so importing them must not pull the
 * dialog implementations into the resident set.
 */
export const WELCOME_SCREEN = `${meta.profile.key}.component.welcome-screen`;

export const AUTHORIZING_DEVICE_DIALOG = `${meta.profile.key}.component.authorizing-device-dialog`;

export const ABOUT_DIALOG = `${meta.profile.key}.component.about-dialog`;

export const NATIVE_REDIRECT_DIALOG = `${meta.profile.key}.component.native-redirect-dialog`;
