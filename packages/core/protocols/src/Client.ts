//
// Copyright 2026 DXOS.org
//

import type * as ClientLoggingPb from '@dxos/protocols/buf/dxos/client/logging_pb';
import type * as ClientServicesPb from '@dxos/protocols/buf/dxos/client/services_pb';
import type * as DevtoolsHostPb from '@dxos/protocols/buf/dxos/devtools/host_pb';
import type * as IframePb from '@dxos/protocols/buf/dxos/iframe_pb';
import type * as TracingPb from '@dxos/protocols/buf/dxos/tracing_pb';

import type * as Rpc from './Rpc.ts';

export interface SpacesService extends Rpc.RpcHandlers<typeof ClientServicesPb.SpacesService> {}

export interface SystemService extends Rpc.RpcHandlers<typeof ClientServicesPb.SystemService> {}

export interface NetworkService extends Rpc.RpcHandlers<typeof ClientServicesPb.NetworkService> {}

export interface EdgeAgentService extends Rpc.RpcHandlers<typeof ClientServicesPb.EdgeAgentService> {}

export interface TracingService extends Rpc.RpcHandlers<typeof TracingPb.TracingService> {}

export interface DevtoolsHost extends Rpc.RpcHandlers<typeof DevtoolsHostPb.DevtoolsHost> {}

export interface ContactsService extends Rpc.RpcHandlers<typeof ClientServicesPb.ContactsService> {}

export interface LoggingService extends Rpc.RpcHandlers<typeof ClientLoggingPb.LoggingService> {}

export interface WorkerService extends Rpc.RpcHandlers<typeof IframePb.WorkerService> {}

export interface AppService extends Rpc.RpcHandlers<typeof IframePb.AppService> {}

export interface ShellService extends Rpc.RpcHandlers<typeof IframePb.ShellService> {}
