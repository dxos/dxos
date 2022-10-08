//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { createIFramePort } from '@dxos/rpc-tunnel';

void (async () => {
  const iframe = document.getElementById('client') as HTMLIFrameElement;
  const rpcPort = createIFramePort({ iframe, origin: 'http://localhost:5137', channel: 'dxos' });
  const client = new Client({}, { rpcPort });
  await client.initialize();

  console.log(client.info);
})();
