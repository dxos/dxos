//
// Copyright 2021 DXOS.org
//

import type { MulticastObservable } from '@dxos/async';
import type { EchoSchema } from '@dxos/echo-schema';
import type { PublicKey } from '@dxos/keys';
import type { Invitation } from '@dxos/protocols/proto/dxos/client/services';

import type { AuthenticatingInvitation } from './invitations';
import type { Space } from './space';

// Space properties key for default metadata.
// TODO(wittjosiah): Remove. Default space should be indicated by data in HALO space.
export const defaultKey = '__DEFAULT__';

/**
 * TODO(burdon): Public API (move comments here).
 */
// TODO(wittjosiah): Rename?
//   https://ts.dev/style/#naming-style
//   ClientApi? ClientProtocol?
export interface Echo extends MulticastObservable<Space[]> {
  /**
   * Returns the list of spaces.
   */
  get(): Space[];

  /**
   * Returns the space with the given key.
   */
  get(spaceKey: PublicKey): Space | undefined;

  /**
   * Returns the default space.
   */
  get default(): Space;

  /**
   * Creates a new space.
   */
  create(): Promise<Space>;

  /**
   * Creates a space from the given snapshot.
   */
  // clone(snapshot: SpaceSnapshot): Promise<Space>;

  /**
   * Joins an existing space using the given invitation.
   */
  join(invitation: Invitation | string): AuthenticatingInvitation;

  /**
   * Adds a schema to ECHO.
   */
  addSchema(schema: EchoSchema): void;
}
