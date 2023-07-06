import { text } from '@dxos/plate';
import template from '../template.t';

export default template.define
  .slots({
    content: '<div>Your code goes here</div>',
    extraImports: '',
  })
  .script({
    content: ({ input, slots, imports }) => {
      const { react, pwa, dxosUi, name } = input;
      const { ClientProvider, Config, Dynamics, Defaults, Local } = imports.use(
        ['ClientProvider', 'Config', 'Dynamics', 'Defaults', 'Local'],
        '@dxos/react-client',
      );
      const ThemeProvider = imports.use('ThemeProvider', '@dxos/react-appkit');
      const useRegisterSW = imports.use('useRegisterSW', 'virtual:pwa-register/react');
      const { ResetDialog, ServiceWorkerToastContainer, GenericFallback, appkitTranslations } = imports.use(
        ['ResetDialog', 'ServiceWorkerToastContainer', 'GenericFallback', 'appkitTranslations'],
        '@dxos/react-appkit',
      );

      const swToast = () => text`<${ServiceWorkerToastContainer} {...serviceWorker} />`;

      const coreContent = text`
    <ErrorBoundary fallback={({ error }) => <${ResetDialog} error={error} config={config} />}>
      <${ClientProvider} config={config} ${dxosUi ? `fallback={${GenericFallback}}` : ''}>
        ${slots.content}
        ${dxosUi && pwa && swToast}
      </${ClientProvider}>
    </ErrorBoundary>`;

      const themeProvider = (content: string) => text`
    <${ThemeProvider} appNs='${name}' resourceExtensions={[${appkitTranslations}]} fallback={<${GenericFallback} />}>
      ${content}
    </${ThemeProvider}>
    `;

      return (
        react &&
        text`
      import React from 'react';
      ${imports}
      import { ErrorBoundary } from './ErrorBoundary';
      
      ${slots.extraImports}
      
      // Dynamics allows configuration to be supplied by the hosting KUBE.
      const config = async () => new ${Config}(await ${Dynamics}(), ${Local}(), ${Defaults}());

      export const App = () => {
        ${pwa && `const serviceWorker = ${useRegisterSW}();`}
        return (
          ${dxosUi ? themeProvider(coreContent) : coreContent}
        )
      }`
      );
    },
  });
