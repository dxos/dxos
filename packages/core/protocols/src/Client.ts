//
// Copyright 2026 DXOS.org
//

import type * as ClientLoggingPb from '@dxos/protocols/buf/dxos/client/logging_pb';
import type * as ClientServicesPb from '@dxos/protocols/buf/dxos/client/services_pb';
import type * as DevtoolsHostPb from '@dxos/protocols/buf/dxos/devtools/host_pb';
import type * as IframePb from '@dxos/protocols/buf/dxos/iframe_pb';
import type * as TracingPb from '@dxos/protocols/buf/dxos/tracing_pb';

import type * as Rpc from './Rpc.ts';

export interface SpacesService extends Rpc.BufRpcHandlers<typeof ClientServicesPb.SpacesService> {}

export interface SystemService extends Rpc.BufRpcHandlers<typeof ClientServicesPb.SystemService> {}

export interface NetworkService extends Rpc.BufRpcHandlers<typeof ClientServicesPb.NetworkService> {}

export interface EdgeAgentService extends Rpc.BufRpcHandlers<typeof ClientServicesPb.EdgeAgentService> {}

export interface TracingService extends Rpc.BufRpcHandlers<typeof TracingPb.TracingService> {}

export interface DevtoolsHost extends Rpc.BufRpcHandlers<typeof DevtoolsHostPb.DevtoolsHost> {}

export interface ContactsService extends Rpc.BufRpcHandlers<typeof ClientServicesPb.ContactsService> {}

export interface LoggingService extends Rpc.BufRpcHandlers<typeof ClientLoggingPb.LoggingService> {}

export interface WorkerService extends Rpc.BufRpcHandlers<typeof IframePb.WorkerService> {}

export interface AppService extends Rpc.BufRpcHandlers<typeof IframePb.AppService> {}

export interface ShellService extends Rpc.BufRpcHandlers<typeof IframePb.ShellService> {}
