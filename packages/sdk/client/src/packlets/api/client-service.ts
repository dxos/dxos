//
// Copyright 2020 DXOS.org
//

import { OpenProgress } from '@dxos/echo-db';
import { DataService, schema as schemaProtocol } from '@dxos/echo-protocol';
import { createServiceBundle } from '@dxos/rpc';

import { PartyService, ProfileService, SystemService, HaloService, DevtoolsHost, TracingService, schema } from '../proto';

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

// TODO(burdon): Required by devtools?
export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.SystemService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  HaloService: schema.getService('dxos.client.HaloService'),
  // TODO(burdon): Rename ECHOService?
  // DataService is provided and implemented internally in ECHO so we import it from there.
  DataService: schemaProtocol.getService('dxos.echo.service.DataService'),
  DevtoolsHost: schema.getService('dxos.devtools.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.TracingService')
});

export interface ClientServiceProvider {
  services: ClientServices
  open(onProgressCallback?: ((progress: OpenProgress) => void) | undefined): Promise<void>
  close(): Promise<void>
}
