import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input, defaultOutputFile, slots, ...rest }) => {
    const { react, pwa, dxosUi, name } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ ...rest, input, defaultOutputFile, imports });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults } = imports.lazy(['Config', 'Dynamics', 'Defaults'], '@dxos/config');
    const ThemeProvider = imports.lazy('ThemeProvider', '@dxos/react-components');
    const useRegisterSW = imports.lazy('useRegisterSW', 'virtual:pwa-register/react');
    const { ServiceWorkerToastContainer, GenericFallback, appkitTranslations } = imports.lazy(
      ['ServiceWorkerToastContainer', 'GenericFallback', 'appkitTranslations'],
      '@dxos/react-appkit'
    );

    const swToast = () => `<${ServiceWorkerToastContainer()} {...serviceWorker} />`;
    
    const coreContent = text`
    <${ClientProvider()} config={config} ${dxosUi ? `fallback={${GenericFallback()}}` : ''}>
      ${render.content()}
      ${dxosUi && pwa && swToast()}
    </${ClientProvider()}>`;

    const themeProvider = (content: string) => text`
    <${ThemeProvider()} appNs='${name}' resourceExtensions={[${appkitTranslations()}]} fallback={<${GenericFallback()} />}>
      ${content}
    </${ThemeProvider()}>
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
        ${pwa && `const serviceWorker = ${useRegisterSW()}();`}
        return (
          ${dxosUi ? themeProvider(coreContent) : coreContent}
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
