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
      import { Client, Config, Defaults, Local } from '@dxos/client';

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

    const createWorker = () =>
      new SharedWorker(new URL('./shared-worker', import.meta.url), {
        type: 'module',
        name: 'dxos-client-worker',
      });
    
    void (async () => {
      // Grab a configuration with defaults.
      const config = new Config(Local(), Defaults());
      // Create a client.
      const client = new Client({ config, createWorker, shell: './shell.html' });
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
