//
// Copyright 2021 DXOS.org
//

import { Client, Space } from '@dxos/client';
import { Config } from '@dxos/config';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';

export interface ClientSetup {
  client: Client;
  space: Space;
  invitation: Invitation;
}

export const setupClient = async (config?: Config): Promise<ClientSetup> => {
  const client = new Client({ config });
  await client.initialize();
  await client.halo.createProfile({ displayName: 'Client' });
  const space = await client.echo.createSpace();

  // TODO(burdon): Observable.
  await space.createInvitation();
  throw new Error('Not implemented.');
};
