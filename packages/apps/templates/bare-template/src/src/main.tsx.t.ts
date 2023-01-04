//
// Copyright 2022 DXOS.org
//

import { defineTemplate, text } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate<typeof config>(({ input, outputDirectory }) => {
  const { react } = input;
  return !react
    ? null
    : text`
    import React from 'react';
    import { createRoot } from 'react-dom/client';

    import { App } from './App';

    createRoot(document.getElementById('root')!).render(<App />);
    `;
});
