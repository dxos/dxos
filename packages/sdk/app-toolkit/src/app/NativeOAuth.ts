//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Native OAuth bridge for the Tauri shell.
 *
 * The web app opens a tab and lets EDGE redirect it back to its own origin. Neither half works on
 * desktop: WKWebView returns null from `window.open`, and providers refuse to authenticate inside
 * an embedded webview anyway — Google's `disallowed_useragent` policy names `WKWebView` on macOS.
 * So the flow runs in the user's real browser, where their existing sessions, password manager and
 * 2FA already live, and returns to a loopback server the shell owns.
 *
 * That server's origin has to be the one EDGE redirects to, and EDGE takes it from the `Origin`
 * header of the initiate request — which page script cannot set. Hence `/oauth/initiate` is issued
 * from Rust here rather than through `EdgeHttpClient`.
 */

import * as Effect from 'effect/Effect';
import type * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

/** Tauri event carrying a callback the loopback server received, as an absolute URL string. */
export const OAUTH_CALLBACK_EVENT = 'dxos:oauth-callback';

/**
 * Whether OAuth has to run through the shell rather than a browser tab the app opens itself.
 *
 * The commands behind it are registered for desktop targets only; native mobile onboarding is
 * passkey-only and never reaches an OAuth flow.
 */
export const supportsNativeOAuth = (): boolean => isTauri();

/** The client's `InitiateOAuthFlowRequest`, as the shell's initiate command takes it. */
export type NativeOAuthRequest = {
  edgeUrl: string;
  provider: string;
  scopes: string[];
  spaceId: string;
  accessTokenId: string;
  /** The caller's EDGE presentation, so EDGE can associate the flow with the current identity. */
  authHeader?: string;
  /** Account recovery only — selects the flow and asks EDGE to write the recovery binding. */
  purpose?: 'register' | 'recovery';
  registerRecovery?: boolean;
  /** atproto handle or DID; atproto cannot resolve the user's auth server without it. */
  loginHint?: string;
};

/**
 * Begin an OAuth flow in the system browser.
 *
 * Returns once the browser is open. Completion arrives out of band, on
 * {@link nativeOAuthCallbacks} — this never waits for it.
 */
export const startNativeOAuth = async (request: NativeOAuthRequest): Promise<void> => {
  const { invoke } = await import('@tauri-apps/api/core');
  const { openUrl } = await import('@tauri-apps/plugin-opener');

  const port = await invoke<number>('start_oauth_server');
  const redirectOrigin = `http://localhost:${port}`;
  log('starting native OAuth flow', { provider: request.provider, purpose: request.purpose, port });

  const authUrl = await invoke<string>('initiate_oauth_flow', { ...request, redirectOrigin });

  // Via the relay page rather than the provider directly, so the browser reaches the provider from
  // the same origin the callback returns to.
  await openUrl(`${redirectOrigin}/oauth-relay?authUrl=${encodeURIComponent(authUrl)}`);
};

/**
 * Subscribe to the callbacks the loopback server receives for one flow, resolving with an
 * unsubscribe function.
 *
 * The event is app-wide while a callback belongs to exactly one flow, so anything that is not this
 * flow's `callbackPath` is another listener's and is dropped here rather than at each call site.
 */
export const listenForNativeOAuthCallback = async (
  callbackPath: string,
  onCallback: (url: URL) => void,
): Promise<() => void> => {
  const { listen } = await import('@tauri-apps/api/event');
  return listen<string>(OAUTH_CALLBACK_EVENT, ({ payload }) => {
    try {
      const url = new URL(payload);
      if (url.pathname === callbackPath) {
        onCallback(url);
      }
    } catch (error) {
      log.warn('unparseable OAuth callback url', { error });
    }
  });
};

/**
 * The shell's callbacks for `callbackPath`, as a stream — a callback for any other path belongs to
 * another flow and is dropped.
 *
 * A stream rather than a listener because each callback is handled by an effect that needs its
 * caller's services. Fails if the listener cannot be registered, since nothing would arrive.
 */
export const nativeOAuthCallbacks = (callbackPath: string): Stream.Stream<URL, Error> =>
  EffectEx.streamFromEmitter<URL, Error>((emit) => {
    let unlisten: (() => void) | undefined;
    let stopped = false;
    void listenForNativeOAuthCallback(callbackPath, (url) => emit.single(url)).then(
      (fn) => {
        unlisten = fn;
        if (stopped) {
          fn();
        }
      },
      // Registration failing silently would leave the flow waiting on a callback nothing is
      // listening for, so it ends the stream instead of surfacing as an unhandled rejection.
      (error) => emit.fail(error instanceof Error ? error : new Error(String(error))),
    );
    return Effect.sync(() => {
      stopped = true;
      unlisten?.();
    });
  });
