//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import { IdentityService } from '@dxos/protocols/proto/dxos/client';
import {
  DevicesService,
  HaloInvitationsService,
  NetworkService,
  SpaceInvitationsService,
  SpacesService,
  SystemService
} from '@dxos/protocols/proto/dxos/client/services';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle, ServiceBundle } from '@dxos/rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  HaloInvitationsService: HaloInvitationsService;
  DevicesService: DevicesService;

  SpaceInvitationsService: SpaceInvitationsService;
  SpacesService: SpacesService;

  NetworkService: NetworkService;

  // TODO(burdon): Deprecated.
  DataService: DataService;
  IdentityService: IdentityService;
  SystemService: SystemService;
  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;
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
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  HaloInvitationsService: schema.getService('dxos.client.services.HaloInvitationsService'),
  NetworkService: schema.getService('dxos.client.services.NetworkService'),
  SpaceInvitationsService: schema.getService('dxos.client.services.SpaceInvitationsService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  SystemService: schema.getService('dxos.client.services.SystemService'),

  // TODO(burdon): Deprecated.
  DataService: schema.getService('dxos.echo.service.DataService'),
  IdentityService: schema.getService('dxos.client.IdentityService'),
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService')
});
