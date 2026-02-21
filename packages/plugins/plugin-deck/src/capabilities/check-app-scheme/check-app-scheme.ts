//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { isTauri } from '@dxos/util';

import { DeckCapabilities } from '../../types';

const APP_SCHEME = 'composer://';

/**
 * Attempts to redirect from the web app to the native desktop app using a custom URL scheme.
 * Creates a hidden iframe that navigates to the custom scheme URL (e.g., composer://workspace/123).
 * If the native app is installed and handles the scheme, the user will be redirected.
 * The iframe is automatically removed after 3 seconds or when the page is hidden.
 */
// TODO(mjamesderocher): Factor out as part of NavigationPlugin.
const checkAppScheme = (url: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);

  iframe.src = url + window.location.pathname.replace(/^\/+/, '') + window.location.search;

  const timer = setTimeout(() => {
    document.body.removeChild(iframe);
  }, 3000);

  window.addEventListener('pagehide', (event) => {
    clearTimeout(timer);
    document.body.removeChild(iframe);
  });
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
    if (!isTauri() && settings?.enableNativeRedirect) {
      checkAppScheme(APP_SCHEME);
    }
  }),
);
