//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';

void (async () => {
  const config = new Config(await Dynamics(), Defaults());
  const client = new Client({ config });
  await client.initialize();

  const element = document.createElement('pre');
  element.innerText = JSON.stringify(client.info, null, 2);
  document.body.appendChild(element);
})();
