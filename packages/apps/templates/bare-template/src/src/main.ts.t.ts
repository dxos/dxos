//
// Copyright 2022 DXOS.org
//

import { text } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react, dxosUi } }) => {
    return (
      !react &&
      text`
    import { Client } from '@dxos/client';
    import { Config, Defaults, Dynamics, Local } from '@dxos/config';

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
    );
  },
});
