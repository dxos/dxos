//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Identity } from '@dxos/halo';

// #region create
/** Creates the identity, with this device as its first member. */
export const createIdentity = (name: string) =>
  Identity.create({ displayName: name });
// #endregion

// #region follow
/** The identity now, and again after each change; undefined before it exists. */
export const me = Identity.identity.pipe(Stream.map(Option.getOrUndefined));
// #endregion

// #region rename
/** Changes the name everyone who shares a space with you sees. */
export const rename = (name: string) =>
  Identity.updateProfile({ displayName: name });
// #endregion
