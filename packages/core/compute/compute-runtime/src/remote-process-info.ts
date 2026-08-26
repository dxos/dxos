//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Process from '@dxos/compute/Process';
import { Annotation } from '@dxos/echo';
import { SpaceId, URI } from '@dxos/keys';
import { ErrorCodec, type ProcessProtocol } from '@dxos/protocols';

import type * as ProcessManager from './ProcessManager';

/**
 * Conversions between the {@link ProcessProtocol} wire shapes and the in-process types, shared by the
 * remote handle and the remote manager. Ids, space ids and URIs are branded strings and annotation
 * dictionaries are keyed by a branded key, so every one of these is a decode rather than an
 * assertion — the wire values come from another runtime.
 */

/** The wire state strings are the `Process.State` enum's own values. */
export const toState = Schema.decodeUnknownSync(Schema.Enum(Process.State));

export const toProcessId = Schema.decodeUnknownSync(Process.ID);

export const toAnnotations = Schema.decodeUnknownSync(Annotation.Dictionary);

const EnvironmentSchema = Schema.Struct({
  space: Schema.optional(SpaceId),
  conversation: Schema.optional(URI.Schema),
});

export const toEnvironment = Schema.decodeUnknownSync(EnvironmentSchema);

/** The host reports a failure as a `SerializedError`; a FAILED process without one is still a failure. */
export const toError = (error: ProcessProtocol.ProcessInfo['error']): Error =>
  error ? ErrorCodec.decode(error) : new Error('remote process failed');

export const toParams = (params: ProcessProtocol.ProcessParams): Process.Params => ({
  name: params.name,
  annotations: toAnnotations(params.annotations),
});

export const toStatus = (info: ProcessProtocol.ProcessInfo): ProcessManager.Status => {
  const state = toState(info.state);
  return {
    state,
    exit:
      state === Process.State.FAILED
        ? Option.some(Exit.die(toError(info.error)))
        : state === Process.State.SUCCEEDED || state === Process.State.TERMINATED
          ? Option.some(Exit.void)
          : Option.none(),
    startedAt: new Date(info.startedAt),
    completedAt: info.completedAt === undefined ? Option.none() : Option.some(new Date(info.completedAt)),
  };
};

/**
 * Decoded projection of a wire {@link ProcessProtocol.ProcessInfo}, computed once per response.
 *
 * Every branded field is decoded here rather than in a property getter: the values come from another
 * runtime, so a mismatch is an anticipated case, and `Schema.decodeUnknownSync` raises a
 * `ParseError` synchronously — from a getter that surfaces at an arbitrary property read instead of
 * as a failure of the effect that fetched the value.
 */
export interface DecodedInfo {
  readonly pid: Process.ID;
  readonly parentId: Process.ID | null;
  readonly state: Process.State;
  readonly params: Process.Params;
  readonly environment: Process.Environment;
}

export const decodeInfo = (info: ProcessProtocol.ProcessInfo): Effect.Effect<DecodedInfo> =>
  Effect.try({
    try: (): DecodedInfo => ({
      pid: toProcessId(info.pid),
      parentId: info.parentPid === null ? null : toProcessId(info.parentPid),
      state: toState(info.state),
      params: toParams(info.params),
      environment: toEnvironment(info.environment),
    }),
    catch: (cause) => cause,
  }).pipe(Effect.orDie);

export const toInfo = (info: ProcessProtocol.ProcessInfo): Process.Info => ({
  pid: toProcessId(info.pid),
  parentPid: info.parentPid === null ? null : toProcessId(info.parentPid),
  key: info.key,
  params: toParams(info.params),
  environment: toEnvironment(info.environment),
  state: toState(info.state),
  error: info.error,
  startedAt: info.startedAt,
  completedAt: info.completedAt === undefined ? Option.none() : Option.some(info.completedAt),
  metrics: info.metrics,
});
