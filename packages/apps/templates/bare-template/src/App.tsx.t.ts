import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input, defaultOutputFile, slots, ...rest }) => {
    const { react, pwa, dxosUi, name } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ ...rest, input, defaultOutputFile, imports });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults } = imports.lazy(['Config', 'Dynamics', 'Defaults'], '@dxos/config');
    const UiKitProvider = imports.lazy('UiKitProvider', '@dxos/react-components');
    const useRegisterSW = imports.lazy('useRegisterSW', 'virtual:pwa-register/react');
    const ServiceWorkerToast = imports.lazy('ServiceWorkerToast', '@dxos/react-appkit');
    const swToast = () => text`
    {needRefresh ? (
      <${ServiceWorkerToast()} {...{ variant: 'needRefresh', updateServiceWorker }} />
    ) : offlineReady ? (
      <${ServiceWorkerToast()} variant='offlineReady' />
    ) : null}`;
    const Fallback = imports.lazy('Fallback', '@dxos/react-appkit');
    const GenericFallback = imports.lazy('GenericFallback', '@dxos/react-appkit');
    const coreContent = text`
    <${ClientProvider()} config={config} ${dxosUi ? `fallback={<${GenericFallback()} />}` : ''}>
      ${render.content()}
      ${dxosUi && pwa && swToast()}
    </${ClientProvider()}>`;
    const uiProviders = (content: string) => text`
    <${UiKitProvider()} appNs='${name}' fallback={<${Fallback()} message='Loading...' />}>
      ${content}
    </${UiKitProvider()}>
    `;
    return !react
      ? null
      : text`
      import React from 'react';
      ${() => imports.render(defaultOutputFile)}
      ${render.extraImports()}
      
      // Dynamics allows configuration to be supplied by the hosting KUBE
      const config = async () => new ${Config()}(await ${Dynamics()}(), ${Defaults()}());

      export const App = () => {
        ${
          pwa &&
          text`
        ${
          !!dxosUi &&
          `const {
          offlineReady: [offlineReady, _setOfflineReady],
          needRefresh: [needRefresh, _setNeedRefresh],
          updateServiceWorker
        } = `
        }${useRegisterSW()}({
          onRegisterError: (err) => {
            console.error(err);
          }
        });`
        }
        return (
          ${dxosUi ? uiProviders(coreContent) : coreContent}
        )
      }
      `;
  },
  {
    config,
    slots: {
      content: '{/* your components here */}',
      extraImports: ''
    }
  }
);
