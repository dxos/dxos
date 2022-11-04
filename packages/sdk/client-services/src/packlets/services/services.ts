//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import { ProfileService, SystemService, HaloService } from '@dxos/protocols/proto/dxos/client';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle } from '@dxos/rpc';

//
// No impl dependencies.
//

export type ClientServices = {
  // SpacesService: SpacesService;
  // SpaceInvitationService: InvitationService;

  DataService: DataService;
  HaloService: HaloService;
  ProfileService: ProfileService;
  SystemService: SystemService;

  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;
};

/**
 * Set of services that are multiplexed between the client and service backend.
 */
export const clientServiceBundle = createServiceBundle<ClientServices>({
  // New
  // SpacesService: schema.getService('dxos.client.services.SpacesService'),
  // SpaceInvitationService: schema.getService('dxos.client.services.InvitationService'),

  // Old
  DataService: schema.getService('dxos.echo.service.DataService'),
  HaloService: schema.getService('dxos.client.HaloService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  SystemService: schema.getService('dxos.client.SystemService'),

  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService')
});

export interface ClientServiceProvider {
  services: ClientServices;
  open(onProgressCallback?: ((progress: any) => void) | undefined): Promise<void>;
  close(): Promise<void>;
}
