//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client, type ClientOptions } from '@dxos/client';

export type ClientPluginOptions = ClientOptions & {
  /**
   * A client to adopt instead of constructing one, so a host can start `initialize()` at entry
   * rather than when activation reaches this lazily-imported module. `@synchronized`, so the
   * plugin's own call joins it; lifecycle stays with the plugin, which destroys it on teardown.
   * A getter is read on activation, for a host that builds its plugin list before its client.
   */
  client?: Client | (() => Client);

  /**
   * Whether the navigation handler consumes invitation codes from URL query params.
   * Disable when another plugin (e.g. plugin-onboarding) owns the invitation URL flow.
   * @default true
   */
  invitationUrlHandler?: boolean;

  /**
   * Base origin for the invitation link.
   */
  shareableLinkOrigin?: string;

  /**
   * Surface the identity-swapping actions kept for testing: join another identity by device
   * invitation, or restore one from a recovery code. Both wipe local storage before they run, so
   * an app whose onboarding gate offers the same flows on a clean profile should pass the inverse
   * of that gate's condition rather than expose them to real users.
   * @default false
   */
  identityTestActions?: boolean;

  /**
   * Path for the invitation link.
   */
  invitationPath?: string;

  /**
   * Query parameter for the invitation code.
   */
  invitationProp?: string;

  /**
   * Run after the client has been initialized.
   * Plugin context is provided so capabilities are accessible.
   */
  onClientInitialized?: (params: { client: Client }) => Effect.Effect<void, Error | never, Capability.Service | never>;

  /**
   * Called when the forked `client.initialize()` fails or exceeds `initializeTimeout`.
   *
   * The initialization runs outside the render tree, so nothing surfaces a failure on its own —
   * consumers suspended on the client simply keep waiting. Apps supply this to raise it as a
   * fatal error (Composer shows the reset dialog).
   */
  onClientInitializationError?: (params: {
    error: unknown;
  }) => Effect.Effect<void, Error | never, Capability.Service | never>;

  /**
   * Bounds the wait on `client.initialize()` before `onClientInitializationError` fires.
   * @default INITIALIZE_TIMEOUT
   */
  initializeTimeout?: number;

  /**
   * Start `client.initialize()` only when something first resolves `ClientService.client`, rather than
   * on activation. For imperative hosts (the CLI), so a command that never uses the client neither
   * waits for its initialization nor fails with it. The app leaves it off: it always uses the client.
   *
   * @default false
   */
  initializeOnUse?: boolean;

  /**
   * Called when spaces are ready.
   * Plugin context is provided so capabilities are accessible.
   */
  onSpacesAvailable?: (params: { client: Client }) => Effect.Effect<void, Error | never, Capability.Service | never>;
};
