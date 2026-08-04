//
// Copyright 2023 DXOS.org
//

import type * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type Client, type ClientOptions } from '@dxos/client';

export type ClientPluginOptions = ClientOptions & {
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
