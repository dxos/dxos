import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input, defaultOutputFile, slots, ...rest }) => {
    const { react, pwa, dxosUi, name } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ ...rest, input, defaultOutputFile, imports });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults } = imports.lazy(['Config', 'Dynamics', 'Defaults'], '@dxos/config');
    const UiKitProvider = imports.lazy('UiKitProvider', '@dxos/react-uikit');
    const useRegisterSW = imports.lazy('useRegisterSW', 'virtual:pwa-register/react');
    const { ServiceWorkerToastContainer, GenericFallback, translations } = imports.lazy(
      ['ServiceWorkerToastContainer', 'GenericFallback', 'translations'],
      '@dxos/react-appkit'
    );

    const swToast = () => `<${ServiceWorkerToastContainer()} {...serviceWorker} />`;
    
    const coreContent = text`
    <${ClientProvider()} config={config} ${dxosUi ? `fallback={<${GenericFallback()} />}` : ''}>
      ${render.content()}
      ${dxosUi && pwa && swToast()}
    </${ClientProvider()}>`;

    const uiProviders = (content: string) => text`
    <${UiKitProvider()} appNs='${name}' resourceExtensions={[${translations()}]} fallback={<${GenericFallback()} />}>
      ${content}
    </${UiKitProvider()}>
    `;
    
    return !react
      ? null
      : text`
      import React from 'react';
      ${() => imports.render(defaultOutputFile)}
      
      ${render.extraImports()}
      
      ${dxosUi && text`
      // this includes css styles from @dxos/react-ui
      import '@dxosTheme';`}
      
      // Dynamics allows configuration to be supplied by the hosting KUBE
      const config = async () => new ${Config()}(await ${Dynamics()}(), ${Defaults()}());

      export const App = () => {
        ${pwa && `const serviceWorker = ${useRegisterSW()}();`}
        return (
          ${dxosUi ? uiProviders(coreContent) : coreContent}
        )
      }`;
  },
  {
    config,
    slots: {
      content: '<div>Your code goes here</div>',
      extraImports: ''
    }
  }
);
