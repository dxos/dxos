//
// Copyright 2023 DXOS.org
//

import { Client } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';

// include any css files directly
import './index.css';

void (async () => {
  // grab a configuration with defaults and dynamic values from KUBE
  const config = new Config(await Dynamics(), Defaults());
  // create a client
  const client = new Client({ config });
  // initialize before using
  await client.initialize();

  // usage:
  console.log(client.toJSON());

  const element = document.getElementById('output') ?? document.createElement('pre');
  element.innerText = JSON.stringify(client.toJSON(), null, 2);
  if (element.getRootNode() === element) {
    document.body.appendChild(element);
  }
})();
