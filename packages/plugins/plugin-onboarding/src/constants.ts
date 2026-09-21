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

/**
 * Id of the Bramble Coffee Roasters space template.
 *
 * Declared here rather than beside the definition so first-launch can name the template without
 * importing the world it builds — that import would pull the whole builder into the boot chunk,
 * which is exactly what the template's own loader exists to prevent.
 */
export const BRAMBLE_TEMPLATE_ID = `${meta.profile.key}.template.bramble`;
