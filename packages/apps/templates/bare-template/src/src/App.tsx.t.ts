import { defineTemplate, renderSlots, text, Imports } from '@dxos/plate';
import config from '../config.t';

export default defineTemplate(
  ({ input, defaultOutputFile, slots, ...rest }) => {
    const { react, pwa, dxosUi, name } = input;
    const imports = new Imports();
    const render = renderSlots(slots)({ ...rest, input, defaultOutputFile, imports });
    const ClientProvider = imports.lazy('ClientProvider', '@dxos/react-client');
    const { Config, Dynamics, Defaults, Local } = imports.lazy(
      ['Config', 'Dynamics', 'Defaults', 'Local'],
      '@dxos/config',
    );
    const ThemeProvider = imports.lazy('ThemeProvider', '@dxos/react-appkit');
    const useRegisterSW = imports.lazy('useRegisterSW', 'virtual:pwa-register/react');
    const { ResetDialog, ServiceWorkerToastContainer, GenericFallback, appkitTranslations } = imports.lazy(
      ['ResetDialog', 'ServiceWorkerToastContainer', 'GenericFallback', 'appkitTranslations'],
      '@dxos/react-appkit',
    );

    const swToast = () => `<${ServiceWorkerToastContainer()} {...serviceWorker} />`;

    const coreContent = text`
    <ErrorBoundary fallback={({ error }) => <${ResetDialog()} error={error} config={config} />}>
      <${ClientProvider()} config={config} ${dxosUi ? `fallback={${GenericFallback()}}` : ''}>
        ${render?.content?.()}
        ${dxosUi && pwa && swToast()}
      </${ClientProvider()}>
    </ErrorBoundary>`;

    const themeProvider = (content: string) => text`
    <${ThemeProvider()} appNs='${name}' resourceExtensions={[${appkitTranslations()}, appTranslations]} fallback={<${GenericFallback()} />}>
      ${content}
    </${ThemeProvider()}>
    `;

    return !react
      ? null
      : text`
      import React from 'react';
      ${() => imports.render(defaultOutputFile)}
      import { ErrorBoundary } from './ErrorBoundary';
      
      ${render?.extraImports?.()}
      
      // Dynamics allows configuration to be supplied by the hosting KUBE.
      const config = async () => new ${Config()}(await ${Dynamics()}(), ${Local()}(), ${Defaults()}());

      ${dxosUi && `const appTranslations = { 'en-US': { '${name}': { 'current app name': 'This app' } } };`}

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
      extraImports: '',
    },
  },
);
