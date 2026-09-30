//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Rpc from 'effect/unstable/rpc/Rpc';
import * as RpcGroup from 'effect/unstable/rpc/RpcGroup';

/** Served by {@link EchoWorkerPlugin} through the worker's router. */
export class EchoRpcs extends RpcGroup.make(
  Rpc.make('echo.echo', { payload: { text: Schema.String }, success: Schema.String }),
  Rpc.make('echo.sessions', { success: Schema.Number }),
) {}

/** Worker→tab surface; empty, served only so the worker's reverse channel completes its handshake. */
export class TabRpcs extends RpcGroup.make() {}
