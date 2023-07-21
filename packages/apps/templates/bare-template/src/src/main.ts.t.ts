//
// Copyright 2022 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate<typeof config>(({ input, outputDirectory }) => {
  const { react, dxosUi } = input;
  return !react
    ? text`
    import { Client, Config, Defaults, Dynamics, Local } from '@dxos/client';

    ${
      dxosUi &&
      text`
    // This includes css styles from @dxos/aurora-theme.
    // This must precede all other style imports in the app.
    import '@dxosTheme';`
    }

    ${
      !dxosUi &&
      text`
    // Include any css files directly.
    import './index.css';`
    }
    
    void (async () => {
      // Grab a configuration with defaults and dynamic values from KUBE.
      const config = new Config(await Dynamics(), Local(), Defaults());
      // Create a client.
      const client = new Client({ config });
      // Initialize before using.
      await client.initialize();
    
      // Usage:
      console.log(client.toJSON());

      const element = document.getElementById('output') ?? document.createElement('pre');
      element.innerText = JSON.stringify(client.toJSON(), null, 2);
      if (element.getRootNode() === element) document.body.appendChild(element);
    })();`
    : null;
});
