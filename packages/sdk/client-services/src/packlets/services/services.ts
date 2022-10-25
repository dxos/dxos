//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import {
  PartyService,
  ProfileService,
  SystemService,
  HaloService
} from '@dxos/protocols/proto/dxos/client';
import {
  DevtoolsHost,
  TracingService
} from '@dxos/protocols/proto/dxos/devtools/host';
import { DataService } from '@dxos/protocols/proto/dxos/echo/service';
import { createServiceBundle } from '@dxos/rpc';

// TODO(burdon): Is there a way to mark TS (generics) so cast isn't required for result of stream?
export type ClientServices = {
  DataService: DataService;
  HaloService: HaloService;
  PartyService: PartyService;
  ProfileService: ProfileService;
  SystemService: SystemService;

  DevtoolsHost: DevtoolsHost;
  TracingService: TracingService;
};

// TODO(burdon): Rethink name/factory.
export const clientServiceBundle = createServiceBundle<ClientServices>({
  DataService: schema.getService('dxos.echo.service.DataService'),
  HaloService: schema.getService('dxos.client.HaloService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  SystemService: schema.getService('dxos.client.SystemService'),

  DevtoolsHost: schema.getService('dxos.devtools.host.DevtoolsHost'),
  TracingService: schema.getService('dxos.devtools.host.TracingService')
});

export interface ClientServiceProvider {
  services: ClientServices;
  open(
    onProgressCallback?: ((progress: any) => void) | undefined
  ): Promise<void>;
  close(): Promise<void>;
}
