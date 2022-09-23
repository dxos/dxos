//
// Copyright 2020 DXOS.org
//

import { OpenProgress } from '@dxos/echo-db';
import { schema } from '@dxos/protocols';
import { PartyService, ProfileService, SystemService, HaloService } from '@dxos/protocols/proto/dxos/client';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle } from '@dxos/rpc';

// TODO(burdon): Is there a way to mark TS (generics) so cast isn't required for result of stream?
export type ClientServices = {
  DataService: DataService
  DevtoolsHost: DevtoolsHost
  HaloService: HaloService
  PartyService: PartyService
  ProfileService: ProfileService
  SystemService: SystemService
  TracingService: TracingService
}

// TODO(burdon): Rethink name/factory.
export const clientServiceBundle = createServiceBundle<ClientServices>({
  DataService: schema.getService('dxos.echo.service.DataService'),
  DevtoolsHost: schema.getService('dxos.devtools.DevtoolsHost'),
  HaloService: schema.getService('dxos.client.HaloService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  SystemService: schema.getService('dxos.client.SystemService'),
  TracingService: schema.getService('dxos.devtools.TracingService')
});

export interface ClientServiceProvider {
  services: ClientServices
  open(onProgressCallback?: ((progress: OpenProgress) => void) | undefined): Promise<void>
  close(): Promise<void>
}
