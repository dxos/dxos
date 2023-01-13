//
// Copyright 2023 DXOS.org
//

import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';

import config from '../config.t';

export default defineTemplate(
  (context) => {
    const { input, defaultOutputFile, slots } = context;
    const { react } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ imports, ...context });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults } = imports.lazy(['Config', 'Dynamics', 'Defaults'], '@dxos/config');
    return !react
      ? null
      : text`
      import React from 'react';
      ${() => imports.render(defaultOutputFile)}

      const config = async () => new ${Config()}(await ${Dynamics()}(), ${Defaults()}());

      export const App = () => {
        return (
          <${ClientProvider()} config={config}>
            ${render.content()}
          </${ClientProvider()}>
        )
      }
      `;
  },
  {
    config,
    slots: {
      content: '{/* your components here */}'
    }
  }
);
