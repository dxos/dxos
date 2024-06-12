//
// Copyright 2021 DXOS.org
//

import type { MulticastObservable } from '@dxos/async';
import type { FilterSource, Query } from '@dxos/echo-db';
import type { PublicKey, SpaceId } from '@dxos/keys';
import type { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import type { QueryOptions } from '@dxos/protocols/proto/dxos/echo/filter';

import type { AuthenticatingInvitation } from './invitations';
import type { PropertiesProps } from './schema';
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
   * Resolves when the default space is available.
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
  create(meta?: PropertiesProps): Promise<Space>;

  /**
   * Creates a space from the given snapshot.
   */
  // clone(snapshot: SpaceSnapshot): Promise<Space>;

  /**
   * Joins an existing space using the given invitation.
   */
  join(invitation: Invitation | string): AuthenticatingInvitation;

  /**
   * Query all spaces.
   * @param filter
   * @param options
   */
  query<T extends {} = any>(filter?: FilterSource<T>, options?: QueryOptions): Query<T>;
}
