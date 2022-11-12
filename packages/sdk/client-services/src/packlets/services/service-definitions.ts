//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import { ProfileService, SystemService, SpaceService } from '@dxos/protocols/proto/dxos/client';
import {
  HaloInvitationsService,
  SpaceInvitationsService,
  SpacesService,
  DevicesService
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

  // TODO(burdon): Deprecated.
  SpaceService: SpaceService;
  DataService: DataService;
  ProfileService: ProfileService;
  SystemService: SystemService;
  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;
};

/**
 * Provide access to client services definitions and service handler.
 */
export interface ClientServicesProvider {
  descriptors: ServiceBundle<ClientServices>;
  services: ClientServices;

  open(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Services supported by host.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  HaloInvitationsService: schema.getService('dxos.client.services.HaloInvitationsService'),
  DevicesService: schema.getService('dxos.client.services.DevicesService'),
  SpaceInvitationsService: schema.getService('dxos.client.services.SpaceInvitationsService'),
  SpacesService: schema.getService('dxos.client.services.SpacesService'),

  // TODO(burdon): Deprecated.
  SpaceService: schema.getService('dxos.client.SpaceService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  SystemService: schema.getService('dxos.client.SystemService'),
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService')
});
