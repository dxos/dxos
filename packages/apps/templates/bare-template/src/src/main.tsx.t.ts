//
// Copyright 2022 DXOS.org
//

import { text } from '@dxos/plate';
import template from '../template.t';

export default template.define.text({
  content: ({ input: { react, dxosUi } }) =>
    react &&
    text`
    import React from 'react';
    import { createRoot } from 'react-dom/client';

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

    import { App } from './App';

    createRoot(document.getElementById('root')!).render(<App />);
    `,
});
