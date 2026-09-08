//
// Copyright 2026 DXOS.org
//

import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';

import * as Process from '@dxos/compute/Process';
import { ErrorCodec } from '@dxos/protocols';

import type * as ProcessManager from './ProcessManager';
import type * as RemoteProcessManager from './RemoteProcessManager';

/**
 * Projections from a {@link RemoteProcessManager.Snapshot} onto the in-process types.
 *
 * Wire decoding is NOT here: `Control` answers in domain types, so a transport (`EdgeProcessControl`
 * in `@dxos/edge-compute`) owns the `ProcessProtocol` shapes and nothing above it sees them.
 */

/** A FAILED process without a serialized error is still a failure. */
export const toError = (error: RemoteProcessManager.Snapshot['error']): Error =>
  error ? ErrorCodec.decode(error) : new Error('remote process failed');

export const toStatus = (snapshot: RemoteProcessManager.Snapshot): ProcessManager.Status => ({
  state: snapshot.state,
  exit:
    snapshot.state === Process.State.FAILED
      ? Option.some(Exit.die(toError(snapshot.error)))
      : snapshot.state === Process.State.SUCCEEDED || snapshot.state === Process.State.TERMINATED
        ? Option.some(Exit.void)
        : Option.none(),
  startedAt: new Date(snapshot.startedAt),
  completedAt: Option.map(snapshot.completedAt, (completedAt) => new Date(completedAt)),
});
