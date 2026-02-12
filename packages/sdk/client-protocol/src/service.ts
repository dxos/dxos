//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Client, type Mesh, type Rpc } from '@dxos/protocols';
import * as ClientLoggingPb from '@dxos/protocols/buf/dxos/client/logging_pb';
import * as ClientQueuePb from '@dxos/protocols/buf/dxos/client/queue_pb';
import * as ClientServicesPb from '@dxos/protocols/buf/dxos/client/services_pb';
import * as DevtoolsHostPb from '@dxos/protocols/buf/dxos/devtools/host_pb';
import * as EchoQueryPb from '@dxos/protocols/buf/dxos/echo/query_pb';
import * as EchoServicePb from '@dxos/protocols/buf/dxos/echo/service_pb';
import * as IframePb from '@dxos/protocols/buf/dxos/iframe_pb';
import * as MeshBridgePb from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import * as TracingPb from '@dxos/protocols/buf/dxos/tracing_pb';
import { createBufServiceBundle } from '@dxos/rpc';

// Transitive type imports required for declaration emit (TS2742).
import type {} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import type {} from '@dxos/protocols/buf/dxos/config_pb';
import type {} from '@dxos/protocols/buf/dxos/echo/indexing_pb';
import type {} from '@dxos/protocols/buf/dxos/edge/signal_pb';
import type {} from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import type {} from '@dxos/protocols/buf/dxos/mesh/teleport/gossip_pb';

export { type QueueService } from '@dxos/protocols';

//
// NOTE: Should contain client/proxy dependencies only.
//

/**
 * Services supported by host.
 */
export const clientServiceBundle = createBufServiceBundle({
  SystemService: ClientServicesPb.SystemService,
  NetworkService: ClientServicesPb.NetworkService,
  LoggingService: ClientLoggingPb.LoggingService,

  IdentityService: ClientServicesPb.IdentityService,
  QueryService: EchoQueryPb.QueryService,
  InvitationsService: ClientServicesPb.InvitationsService,
  DevicesService: ClientServicesPb.DevicesService,
  SpacesService: ClientServicesPb.SpacesService,
  DataService: EchoServicePb.DataService,
  ContactsService: ClientServicesPb.ContactsService,
  EdgeAgentService: ClientServicesPb.EdgeAgentService,
  QueueService: ClientQueuePb.QueueService,

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHostPb.DevtoolsHost,
  TracingService: TracingPb.TracingService,
});

/**
 * Client services type derived from the service bundle.
 * This represents the client-side RPC interface for all services.
 */
export type ClientServices = Rpc.BufRpcClientServices<typeof clientServiceBundle>;

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  /**
   * The connection to the services provider was terminated.
   * This should fire if the services disconnect unexpectedly or during a client reset.
   */
  closed: Event<Error | undefined>;

  /**
   * The underlying service connection was re-established.
   * Fires after all reconnection callbacks have completed.
   */
  reconnected?: Event<void>;

  /**
   * Register a callback to be invoked when services reconnect.
   * The callback should re-establish any RPC streams.
   * Reconnection waits for all callbacks to complete before emitting `reconnected`.
   */
  onReconnect?: (callback: () => Promise<void>) => void;

  descriptors: typeof clientServiceBundle;
  services: Partial<ClientServices>;

  // TODO(burdon): Should take context from parent?
  open(): Promise<unknown>;
  close(): Promise<unknown>;
}

export type IframeServiceBundle = {
  BridgeService: Mesh.BridgeService;
};

export const iframeServiceBundle = createBufServiceBundle({
  BridgeService: MeshBridgePb.BridgeService,
});

export type WorkerServiceBundle = {
  WorkerService: Client.WorkerService;
};

export const workerServiceBundle = createBufServiceBundle({
  WorkerService: IframePb.WorkerService,
});

export type AppServiceBundle = {
  AppService: Client.AppService;
};

export const appServiceBundle = createBufServiceBundle({
  AppService: IframePb.AppService,
});

export type ShellServiceBundle = {
  ShellService: Client.ShellService;
};

export const shellServiceBundle = createBufServiceBundle({
  ShellService: IframePb.ShellService,
});
