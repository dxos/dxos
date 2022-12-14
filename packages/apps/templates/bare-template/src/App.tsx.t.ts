import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input, defaultOutputFile, slots }) => {
    const { react, pwa } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ imports });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults } = imports.lazy(['Config', 'Dynamics', 'Defaults'], '@dxos/config');
    const useRegisterSW = imports.lazy('useRegisterSW', 'virtual:pwa-register/react');
    return !react
      ? null
      : text`
      import React from 'react';
      ${() => imports.render(defaultOutputFile)}

      // Dynamics allows configuration to be supplied by the hosting KUBE
      const config = async () => new ${Config()}(await ${Dynamics()}(), ${Defaults()}());

      export const App = () => {
        ${pwa && text`
        const {
          offlineReady: [offlineReady, _setOfflineReady],
          needRefresh: [needRefresh, _setNeedRefresh],
          updateServiceWorker
        } = ${useRegisterSW()}({
          onRegisterError: (err) => {
            captureException(err);
            log.error(err);
          }
        });`}
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
