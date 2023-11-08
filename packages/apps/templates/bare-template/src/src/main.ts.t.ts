//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react, dxosUi, tailwind } }) => {
    return (
      !react &&
      plate`
      import { Client, Config, Defaults, Dynamics, Local } from '@dxos/client';

    ${
      dxosUi &&
      plate`
    // This includes css styles from @dxos/react-ui-theme.
    // This must precede all other style imports in the app.
    import '@dxosTheme';`
    }

    ${
      !dxosUi &&
      plate`
    // Include any css files directly.
    ${!tailwind && '// '}import './index.css';`
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
