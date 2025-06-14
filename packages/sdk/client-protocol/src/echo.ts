//
// Copyright 2021 DXOS.org
//

import type { MulticastObservable } from '@dxos/async';
import type { QueryFn } from '@dxos/echo-db';
import type { PublicKey, SpaceId } from '@dxos/keys';
import type { Invitation, SpaceArchive } from '@dxos/protocols/proto/dxos/client/services';

import type { AuthenticatingInvitation } from './invitations';
import type { PropertiesTypeProps } from './schema';
import type { Space } from './space';

/**
 * TODO(burdon): Public API (move comments here).
 */
// TODO(wittjosiah): Rename?
//   https://ts.dev/style/#naming-style
//   ClientApi? ClientProtocol?
export interface Echo extends MulticastObservable<Space[]> {
  /**
   * Resolves when the default space is available.
   */
  waitUntilReady(): Promise<void>;

  /**
   * Observable which indicates when the default space is available.
   */
  // TODO(wittjosiah): Remove. Ensure default space is always available.
  get isReady(): MulticastObservable<boolean>;

  /**
   * Returns the list of spaces.
   */
  get(): Space[];

  /**
   * Returns the space with the given id.
   */
  get(id: SpaceId): Space | undefined;

  /**
   * Returns the space with the given key.
   * @deprecated Use `get(id: SpaceId)`.
   */
  get(spaceKey: PublicKey): Space | undefined;

  /**
   * Returns the default space.
   */
  get default(): Space;

  /**
   * Creates a new space.
   */
  create(meta?: PropertiesTypeProps): Promise<Space>;

  /**
   * Creates a space from the given archive.
   */
  import(archive: SpaceArchive): Promise<Space>;

  /**
   * Joins an existing space using the given invitation.
   */
  join(invitation: Invitation | string): AuthenticatingInvitation;

  joinBySpaceKey(spaceKey: PublicKey): Promise<Space>;

  /**
   * Query all spaces.
   * @param filter
   * @param options
   */
  query: QueryFn;
}
