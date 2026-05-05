//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { APP_SCHEME, AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { isTauri } from '@dxos/util';

import { DeckCapabilities } from '#types';

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

/** Dispatch all NavigationHandler contributions with the current page URL. */
const dispatchNavigationHandlers = Effect.fn(function* () {
  const url = new URL(window.location.href);
  const handlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  yield* Effect.all(
    handlers.map((handler) => handler(url)),
    { concurrency: 'unbounded' },
  );
});

/**
 * Checks whether the native redirect setting is enabled and the redirect should be attempted.
 * Exported for the URL handler to decide whether to defer NavigationHandler dispatch.
 */
export const shouldDeferNavigationHandlers = (): boolean => {
  return !isTauri() && !isSafari() && !import.meta.env.DEV && canRedirectToScheme();
};

/**
 * When running in a web browser (not Tauri) with native redirect enabled,
 * tries to open the native app via custom scheme. Defers NavigationHandlers
 * to prevent the web app from consuming one-time tokens before the native app.
 *
 * If the app opens: shows dialog with "Open here" callback that dispatches handlers.
 * If the app doesn't open: dispatches handlers immediately.
 * In Safari: universal links handle this natively, so the check is skipped.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
    const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

    if (!settings?.enableNativeRedirect || !shouldDeferNavigationHandlers()) {
      return;
    }

    const appOpened = yield* Effect.promise(() => tryOpenNativeApp());
    if (appOpened) {
      const onOpenHere = () =>
        Effect.gen(function* () {
          yield* dispatchNavigationHandlers();
          yield* invoke(LayoutOperation.UpdateDialog, { state: false });
        }).pipe(Effect.provideService(Capability.Service, capabilities), runAndForwardErrors);

      yield* invoke(LayoutOperation.UpdateDialog, {
        subject: NATIVE_REDIRECT_DIALOG,
        type: 'alert',
        overlayClasses: 'dark bg-neutral-950!',
        props: { onOpenHere },
      });
    } else {
      yield* dispatchNavigationHandlers();
    }
  }),
);
