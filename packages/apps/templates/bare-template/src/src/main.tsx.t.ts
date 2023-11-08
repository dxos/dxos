//
// Copyright 2022 DXOS.org
//

import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react, dxosUi } }) =>
    react &&
    plate`
    import React from 'react';
    import { createRoot } from 'react-dom/client';

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
    import './index.css';`
    }

    import { App } from './App';

    createRoot(document.getElementById('root')!).render(<App />);
    `,
});
