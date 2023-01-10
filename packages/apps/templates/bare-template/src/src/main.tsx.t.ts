//
// Copyright 2022 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate<typeof config>(({ input, outputDirectory }) => {
  const { react, dxosUi } = input;
  return !react
    ? null
    : text`
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    ${dxosUi && text`
    // this includes css styles from @dxos/react-components
    // this must precede all other style imports in the app
    import '@dxosTheme';`}

    ${!dxosUi && text`
    // include any css files directly
    import './index.css';`}

    import { App } from './App';

    createRoot(document.getElementById('root')!).render(<App />);
    `;
});
