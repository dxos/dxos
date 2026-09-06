//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

import * as Events from './Events.ts';

/**
 * The contract between the browser and the server. Deliberately thin: `Watch` streams the project's
 * log and `Dispatch` appends to it, so almost everything the UI does is an event in flight rather
 * than a method. The three remaining calls are the ones that are genuinely questions — what
 * projects exist, make me one, what model am I talking to.
 */

export class ProjectRecord extends Schema.Class<ProjectRecord>('code-index/Project')({
  id: Schema.String,
  title: Schema.String,
  created: Schema.Number,
}) {}

export class ServerInfo extends Schema.Class<ServerInfo>('code-index/ServerInfo')({
  root: Schema.String,
  provider: Schema.String,
  model: Schema.String,
  /** Quads in the index; a zero here is why an agent has nothing to say. */
  quads: Schema.Number,
  files: Schema.Number,
}) {}

export class RequestFailed extends Schema.TaggedError<RequestFailed>('code-index/RequestFailed')('RequestFailed', {
  message: Schema.String,
}) {}

export class Rpcs extends RpcGroup.make(
  Rpc.make('Info', { success: ServerInfo, error: RequestFailed }),

  Rpc.make('ListProjects', { success: Schema.Array(ProjectRecord), error: RequestFailed }),

  Rpc.make('CreateProject', {
    payload: { title: Schema.optional(Schema.String) },
    success: ProjectRecord,
    error: RequestFailed,
  }),

  /**
   * Everything the UI does to a project. A prompt is an event the server answers by running a
   * turn; a `CanvasCleared` or a `TitleSet` is an event and nothing more. The client does not need
   * to know which is which, and the server decides by tag.
   */
  Rpc.make('Dispatch', {
    payload: { projectId: Schema.String, event: Events.Event },
    success: Schema.Void,
    error: RequestFailed,
  }),

  /** The log from `after`, then everything appended after it — replay and live tail in one stream. */
  Rpc.make('Watch', {
    payload: { projectId: Schema.String, after: Schema.optional(Schema.Number) },
    success: Events.Entry,
    error: RequestFailed,
    stream: true,
  }),
) {}

/** Where the RPC endpoint is mounted; the client prepends it and the dev server routes on it. */
export const PATH = '/rpc';
