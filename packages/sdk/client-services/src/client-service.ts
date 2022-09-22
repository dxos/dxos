//
// Copyright 2020 DXOS.org
//

import { OpenProgress } from '@dxos/echo-db';
import { schema } from '@dxos/protocols';
import { PartyService, ProfileService, SystemService, HaloService } from '@dxos/protocols/proto/dxos/client';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle } from '@dxos/rpc';

// TODO(burdon): Change to lowercase?
// TODO(burdon): Is there a way to mark TS (generics) so cast isn't required for result of stream?
export type ClientServices = {
  SystemService: SystemService
  ProfileService: ProfileService
  HaloService: HaloService
  PartyService: PartyService
  DataService: DataService
  DevtoolsHost: DevtoolsHost
  TracingService: TracingService
}

// TODO(burdon): Rethink name/factory.
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.SystemService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  HaloService: schema.getService('dxos.client.HaloService'),
  // TODO(burdon): Rename ECHOService?
  // DataService is provided and implemented internally in ECHO so we import it from there.
  DataService: schema.getService('dxos.echo.service.DataService'),
  DevtoolsHost: schema.getService('dxos.devtools.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.TracingService')
});

export interface ClientServiceProvider {
  services: ClientServices
  open(onProgressCallback?: ((progress: OpenProgress) => void) | undefined): Promise<void>
  close(): Promise<void>
}
