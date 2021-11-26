//
// Copyright 2020 DXOS.org
//

import { ECHO, OpenProgress } from '@dxos/echo-db';
import { createServiceBundle } from '@dxos/rpc';

import { schema } from '../proto/gen';
import { PartyService, ProfileService, SystemService } from '../proto/gen/dxos/client';
import { DevtoolsHost } from '../proto/gen/dxos/devtools';
import { DataService } from '../proto/gen/dxos/echo/service';

export interface ClientServices {
  SystemService: SystemService;
  ProfileService: ProfileService;
  PartyService: PartyService;
  DataService: DataService;
  DevtoolsHost: DevtoolsHost;
}

export const clientServiceBundle = createServiceBundle<ClientServices>({
  SystemService: schema.getService('dxos.client.SystemService'),
  ProfileService: schema.getService('dxos.client.ProfileService'),
  PartyService: schema.getService('dxos.client.PartyService'),
  DataService: schema.getService('dxos.echo.service.DataService'),
  DevtoolsHost: schema.getService('dxos.devtools.DevtoolsHost')
});

export interface ClientServiceProvider {
  services: ClientServices

  open(onProgressCallback?: ((progress: OpenProgress) => void) | undefined): Promise<void>

  close(): Promise<void>

  // TODO(dmaretskyi): Remove and rely on services.
  /**
   * @deprecated
   */
  echo: ECHO
}
