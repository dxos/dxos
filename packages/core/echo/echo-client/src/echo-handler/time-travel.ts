//
// Copyright 2025 DXOS.org
//

import { type Heads } from '@automerge/automerge';

import { type Obj } from '@dxos/echo';
import { assertArgument } from '@dxos/invariant';

import { getObjectCore } from './echo-handler';
import { isEchoObject } from './echo-object-utils';

/**
 * Pin a live ECHO object to a historical version. Its data/meta reads — including text via
 * `ObjectCore.getDocAccessor` and its label via `Obj.labelAtom` — resolve the value at `heads`
 * until cleared, and the default atom/subscription channels fire so the UI reflects the historical
 * view. `latestOnly` subscribers stay live, writes throw, and the full edit history is unaffected.
 *
 * References are independent cores: call this per object (primary + each child) to time-travel a
 * subtree.
 */
export const setTimeTravel = (obj: Obj.Unknown, heads: Heads): void => {
  assertArgument(isEchoObject(obj), 'obj', 'expected ECHO object stored in the database');
  getObjectCore(obj).setTimeTravel(heads);
};

/**
 * Return a time-traveling object to its latest committed value.
 */
export const clearTimeTravel = (obj: Obj.Unknown): void => {
  assertArgument(isEchoObject(obj), 'obj', 'expected ECHO object stored in the database');
  getObjectCore(obj).clearTimeTravel();
};
