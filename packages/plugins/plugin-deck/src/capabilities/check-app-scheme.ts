//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, NativePasskey } from '@dxos/app-toolkit';
import { EffectEx } from '@dxos/effect';
// Explicit import so the emitted `.d.ts` references the package via its public alias instead of a
// relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';
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
    const schemeUrl = NativePasskey.APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
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
    const schemeUrl = NativePasskey.APP_SCHEME + window.location.pathname.replace(/^\/+/, '') + window.location.search;
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
    const { invoke } = yield* Capabilities.OperationInvoker;
    const navigationHandlers = yield* AppCapabilities.NavigationHandler;
    const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

    if (!settings?.enableNativeRedirect || !shouldDeferNavigationHandlers()) {
      return [];
    }

    /** Dispatch all NavigationHandler contributions with the current page URL. */
    const dispatchNavigationHandlers = () => {
      const url = new URL(window.location.href);
      return Effect.all(
        navigationHandlers.get().map((handler) => handler(url)),
        { concurrency: 'unbounded' },
      );
    };

    const appOpened = yield* Effect.promise(() => tryOpenNativeApp());
    if (appOpened) {
      const onOpenHere = () =>
        Effect.gen(function* () {
          yield* dispatchNavigationHandlers();
          yield* invoke(LayoutOperation.UpdateDialog, { state: false });
        }).pipe(EffectEx.runAndForwardErrors);

      yield* invoke(LayoutOperation.UpdateDialog, {
        subject: NATIVE_REDIRECT_DIALOG,
        type: 'alert',
        overlayClasses: 'dark bg-neutral-950!',
        props: { onOpenHere },
      });
    } else {
      yield* dispatchNavigationHandlers();
    }

    return [];
  }),
);
