//
// Copyright 2022 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate<typeof config>(({ input, outputDirectory }) => {
  const { react, dxosUi } = input;
  return !react
    ? text`
    import { Client } from '@dxos/client';
    import { Config, Defaults, Dynamics } from '@dxos/config';

    ${dxosUi && text`
    // this includes css styles from @dxos/react-components
    // this must precede all other style imports in the app
    import '@dxosTheme';`}

    ${!dxosUi && text`
    // include any css files directly
    import 'index.css';`}
    
    void (async () => {
      // grab a configuration with defaults and dynamic values from KUBE
      const config = new Config(await Dynamics(), Defaults());
      // create a client
      const client = new Client({ config });
      // initialize before using
      await client.initialize();
    
      // usage: 
      const element = document.createElement('pre');
      element.innerText = JSON.stringify(client.toJSON(), null, 2);
      document.body.appendChild(element);
    })();` : null;
});
