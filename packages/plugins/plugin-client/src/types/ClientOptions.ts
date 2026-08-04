//
// Copyright 2023 DXOS.org
//

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client, type ClientOptions } from '@dxos/client';

export type ClientPluginOptions = ClientOptions & {
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
   * Called when spaces are ready.
   * Plugin context is provided so capabilities are accessible.
   */
  onSpacesReady?: (params: { client: Client }) => Effect.Effect<void, Error | never, Capability.Service | never>;

  /**
   * Called when the client is reset.
   * Plugin context is provided so capabilities are accessible.
   */
  onReset?: (params: { target?: string }) => Effect.Effect<void, Error | never, Capability.Service | never>;
};
