//
// Copyright 2020 DXOS.org
//

import { schema } from '@dxos/protocols';
import { PartyService, ProfileService, SystemService, HaloService } from '@dxos/protocols/proto/dxos/client/services';
import { DevtoolsHost, TracingService } from '@dxos/protocols/proto/dxos/devtools/host';
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

const data = get((root) => root.tasks.filter(({ type }) => type == 'done').map((t) => t.assignedTo));

const name = client.halo.profile.displayName;

const tasks = client.echo.query('tasks');

const tasks = client.dmg.getService('spaces.example.com').getSpace('s-1').database.query('tasks');
const calendar = client.dmg.getService('spaces.burdon.com').getSpace('s-2').database.query('tasks');

// TODO(burdon): Rethink name/factory.
// TODO(burdon): DMG service.
export const clientServiceBundle = createServiceBundle<ClientServices>({
  HaloService: schema.getService('dxos.client.HaloService'),

  DataService: schema.getService('dxos.echo.service.DataService'),
  PartyService: schema.getService('dxos.client.PartyService'),
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
