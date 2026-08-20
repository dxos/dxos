//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Native OAuth bridge for the Tauri shell.
 *
 * The web app hands a provider's authorization page to a new tab and lets the post-auth redirect
 * land back on its own origin. The desktop app has neither half available: WKWebView returns null
 * from `window.open`, and a system browser would finalize the flow against its own storage rather
 * than the app's. The shell instead hosts the page in a window it owns, cancels the redirect back
 * to the app origin, and relays that URL here for the running app to finalize.
 */

import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

/** Tauri event carrying an intercepted callback URL, as an absolute URL string. */
export const OAUTH_CALLBACK_EVENT = 'dxos:oauth-callback';

/**
 * Whether the authorization page has to be hosted by the shell rather than a browser tab.
 *
 * The `open_oauth_window` command behind it is registered for desktop targets only; native mobile
 * onboarding is passkey-only and never reaches an OAuth flow.
 */
export const supportsNativeOAuthWindow = (): boolean => isTauri();

/**
 * Open a provider's authorization page in the shell's OAuth window.
 *
 * @param callbackPath Path of the redirect that ends the flow; the shell cancels that navigation
 * and emits its URL rather than letting the window follow it.
 */
export const openNativeOAuthWindow = async (authUrl: string, callbackPath: string): Promise<void> => {
  log('opening native OAuth window', { callbackPath });
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('open_oauth_window', { url: authUrl, callbackPath });
};

/**
 * Subscribe to the callback URLs the shell intercepts, resolving with an unsubscribe function.
 */
export const listenForNativeOAuthCallback = async (onCallback: (url: string) => void): Promise<() => void> => {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<string>(OAUTH_CALLBACK_EVENT, ({ payload }) => onCallback(payload));
};
