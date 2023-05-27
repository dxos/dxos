//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import {
  DevicesService,
  IdentityService,
  InvitationsService,
  LoggingService,
  NetworkService,
  SpacesService,
  SystemService,
} from '@dxos/protocols/proto/dxos/client/services';
import { DevtoolsHost } from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import type { AppService, ShellService, WorkerService } from '@dxos/protocols/proto/dxos/iframe';
import type { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createServiceBundle, ServiceBundle } from '@dxos/rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  SystemService: SystemService;

  IdentityService: IdentityService;
  InvitationsService: InvitationsService;
  DevicesService: DevicesService;
  SpacesService: SpacesService;
  DataService: DataService;

  NetworkService: NetworkService;

  LoggingService: LoggingService;

  // TODO(burdon): Deprecated.
  DevtoolsHost: DevtoolsHost;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  descriptors: ServiceBundle<ClientServices>;
  services: Partial<ClientServices>;

  open(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.services.SystemService'),
  IdentityService: schema.getService('dxos.client.services.IdentityService'),
  InvitationsService: schema.getService('dxos.client.services.InvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),
  LoggingService: schema.getService('dxos.client.services.LoggingService'),

  // TODO(burdon): Deprecated.
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
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
