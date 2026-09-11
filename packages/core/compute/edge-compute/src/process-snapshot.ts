//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { type RemoteProcessManager } from '@dxos/compute-runtime';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation } from '@dxos/echo';
import { SpaceId, URI } from '@dxos/keys';
import type { ProcessProtocol } from '@dxos/protocols';

/**
 * Wire {@link ProcessProtocol} shapes to the domain types `RemoteProcessManager.Control` answers in.
 *
 * This lives with the transport rather than in `@dxos/compute-runtime`: the protocol is how EDGE
 * happens to be reached, and nothing above the `Control` interface should have to know it. Ids,
 * space ids and URIs are branded and annotation dictionaries are keyed by a branded key, so every
 * conversion is a decode rather than an assertion — the values come from another runtime.
 */

/** The wire state strings are the `Process.State` enum's own values. */
const toState = Schema.decodeUnknownSync(Schema.Enum(Process.State));

const toProcessId = Schema.decodeUnknownSync(Process.ID);

const toAnnotations = Schema.decodeUnknownSync(Annotation.Dictionary);

const toEnvironment = Schema.decodeUnknownSync(
  Schema.Struct({
    space: Schema.optional(SpaceId),
    conversation: Schema.optional(URI.Schema),
  }),
);

const toParams = (params: ProcessProtocol.ProcessParams): Process.Params => ({
  name: params.name,
  annotations: toAnnotations(params.annotations),
});

export const decodeSnapshot = (info: ProcessProtocol.ProcessInfo): RemoteProcessManager.Snapshot => ({
  pid: toProcessId(info.pid),
  // `== null`, not `=== null`: a JSON wire cannot carry `undefined`, so a host that omits the field
  // is reporting no parent rather than a pid.
  parentPid: info.parentPid == null ? null : toProcessId(info.parentPid),
  key: info.key,
  params: toParams(info.params),
  environment: toEnvironment(info.environment),
  state: toState(info.state),
  alarmDueAt: info.alarmDueAt,
  error: info.error,
  startedAt: info.startedAt,
  completedAt: info.completedAt === undefined ? Option.none() : Option.some(info.completedAt),
  metrics: info.metrics,
});

/**
 * Wire event to its domain form. Only the trace variant needs work: its `message` crosses as JSON and
 * is rebuilt through `Trace.decodeTraceMessage`, so there is one wire form for trace messages rather
 * than a second one for this transport.
 */
export const decodeEvent = (event: ProcessProtocol.ProcessEvent): RemoteProcessManager.Event =>
  event._tag === 'trace' ? { _tag: 'trace', seq: event.seq, message: decodeTraceMessage(event.message) } : event;

const decodeTraceMessage = (message: unknown): Trace.Message =>
  Trace.decodeTraceMessage(new TextEncoder().encode(JSON.stringify(message)));

/** Domain spawn request to its wire form; annotations are already JSON-safe by this point. */
export const toSpawnRequest = (
  request: Omit<RemoteProcessManager.SpawnRequest, 'spaceId'>,
): ProcessProtocol.SpawnProcessRequest => ({
  key: request.key,
  ...(request.name !== undefined ? { name: request.name } : {}),
  ...(request.parentPid !== undefined ? { parentPid: request.parentPid } : {}),
  ...(request.environment !== undefined ? { environment: request.environment } : {}),
  ...(request.annotations !== undefined ? { annotations: request.annotations } : {}),
});
