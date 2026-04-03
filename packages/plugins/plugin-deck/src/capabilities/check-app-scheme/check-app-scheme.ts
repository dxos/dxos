//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { APP_SCHEME, LayoutOperation } from '@dxos/app-toolkit';
import { isTauri } from '@dxos/util';

import { DeckCapabilities } from '../../types';

/** Identifier for the native redirect dialog surface (defined in welcome plugin). */
const NATIVE_REDIRECT_DIALOG = 'org.dxos.plugin.welcome.component.native-redirect-dialog';

const SCHEME_TIMEOUT_MS = 500;

const isSafari = (): boolean => {
  const ua = navigator.userAgent;
  return ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');
};

/** Check if the current page URL can be converted to a valid custom scheme URL. */
const canRedirectToScheme = (): boolean => {
  try {
    const schemeUrl = APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
    new URL(schemeUrl);
    return true;
  } catch {
    return false;
  }
};

/**
 * Try to open the native app via custom scheme.
 * Resolves `true` if the app opened (page lost focus), `false` if it didn't within the timeout.
 */
const tryOpenNativeApp = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false;

    const onBlur = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    };

    const cleanup = () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        onBlur();
      }
    };

    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Try the scheme via hidden iframe.
    const schemeUrl = APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = schemeUrl;
    document.body.appendChild(iframe);
    setTimeout(() => iframe.remove(), 3000);

    // If no blur within timeout, the app isn't running.
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, SCHEME_TIMEOUT_MS);
  });
};

/**
 * When running in a web browser (not Tauri) with native redirect enabled,
 * tries to open the native app via custom scheme. If the app is running and
 * opens successfully (detected via page blur), shows a dialog so the user
 * can return to the web app if needed. If the app doesn't open, loads the
 * web app normally without showing any dialog.
 * In Safari, universal links handle this natively so the check is skipped.
 */
// TODO(mjamesderocher): Factor out as part of NavigationPlugin.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
    if (!isTauri() && !isSafari() && settings?.enableNativeRedirect && canRedirectToScheme()) {
      const appOpened = yield* Effect.promise(() => tryOpenNativeApp());
      if (appOpened) {
        yield* Effect.promise(() =>
          invokePromise(LayoutOperation.UpdateDialog, {
            subject: NATIVE_REDIRECT_DIALOG,
            type: 'alert',
            overlayClasses: 'dark bg-neutral-950!',
          }),
        );
      }
    }
  }),
);
