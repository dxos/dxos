//
// Copyright 2020 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { schema } from '@dxos/protocols';
import type { FunctionRegistryService } from '@dxos/protocols/proto/dxos/agent/functions';
import type {
  DevicesService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/proto/dxos/client/services';
import type { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';
import type { QueryService } from '@dxos/protocols/proto/dxos/echo/query';
import type { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import type { AppService, ShellService, WorkerService } from '@dxos/protocols/proto/dxos/iframe';
import type { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import type { TracingService } from '@dxos/protocols/proto/dxos/tracing';
import { type ServiceBundle, createServiceBundle } from '@dxos/rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  SystemService: SystemService;
  NetworkService: NetworkService;
  LoggingService: LoggingService;

  IdentityService: IdentityService;
  InvitationsService: InvitationsService;
  QueryService: QueryService;
  DevicesService: DevicesService;
  SpacesService: SpacesService;
  DataService: DataService;

  FunctionRegistryService: FunctionRegistryService;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHost;

  TracingService: TracingService;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  /**
   * The connection to the services provider was terminated.
   * This should fire if the services disconnect unexpectedly or during a client reset.
   */
  closed: Event<Error | undefined>;
  descriptors: ServiceBundle<ClientServices>;
  services: Partial<ClientServices>;

  open(ctx: Context): Promise<void>;
  close(ctx: Context): Promise<void>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),
  LoggingService: schema.getService('dxos.client.services.LoggingService'),

  IdentityService: schema.getService('dxos.client.services.IdentityService'),
  QueryService: schema.getService('dxos.echo.query.QueryService'),
  InvitationsService: schema.getService('dxos.client.services.InvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  DataService: schema.getService('dxos.echo.service.DataService'),

  // Agent-only.
  FunctionRegistryService: schema.getService('dxos.agent.functions.FunctionRegistryService'),

  // TODO(burdon): Deprecated.
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),

  TracingService: schema.getService('dxos.tracing.TracingService'),
});

export type IframeServiceBundle = {
  BridgeService: BridgeService;
};

export const iframeServiceBundle: ServiceBundle<IframeServiceBundle> = {
  BridgeService: schema.getService('dxos.mesh.bridge.BridgeService'),
};

export type WorkerServiceBundle = {
  WorkerService: WorkerService;
};

export const workerServiceBundle: ServiceBundle<WorkerServiceBundle> = {
  WorkerService: schema.getService('dxos.iframe.WorkerService'),
};

export type AppServiceBundle = {
  AppService: AppService;
};

export const appServiceBundle: ServiceBundle<AppServiceBundle> = {
  AppService: schema.getService('dxos.iframe.AppService'),
};

export type ShellServiceBundle = {
  ShellService: ShellService;
};

export const shellServiceBundle: ServiceBundle<ShellServiceBundle> = {
  ShellService: schema.getService('dxos.iframe.ShellService'),
};
