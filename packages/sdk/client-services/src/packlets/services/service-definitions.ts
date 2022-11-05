//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import { ProfileService, SystemService, PartyService } from '@dxos/protocols/proto/dxos/client';
import { SpacesService, InvitationsService } from '@dxos/protocols/proto/dxos/client/services';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle, ServiceBundle } from '@dxos/rpc';

//
// NOTE: Should contain client/proxy dependencies only.
//

export type ClientServices = {
  PartyService: PartyService;
  DataService: DataService;
  ProfileService: ProfileService;
  SystemService: SystemService;
  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;

  SpacesService: SpacesService;
  SpaceInvitationsService: InvitationsService;
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
  PartyService: schema.getService('dxos.client.PartyService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  SystemService: schema.getService('dxos.client.SystemService'),
  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService'),

  SpacesService: schema.getService('dxos.client.services.SpacesService'),
  SpaceInvitationsService: schema.getService('dxos.client.services.InvitationsService')
});
