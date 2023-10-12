import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define
  .slots({
    content: '<p>Your code goes here</p>',
    extraImports: '',
  })
  .script({
    content: ({ input, slots, imports }) => {
      const { react, pwa, dxosUi, name, proto } = input;
      const { ClientProvider, Config, Dynamics, Defaults, Local } = imports.use(
        ['ClientProvider', 'Config', 'Dynamics', 'Defaults', 'Local'],
        '@dxos/react-client',
      );
      const ThemeProvider = imports.use('ThemeProvider', '@dxos/react-appkit');
      const useRegisterSW = imports.use('useRegisterSW', 'virtual:pwa-register/react');
      // TODO(wittjosiah): Remove appkit.
      const { ResetDialog, ServiceWorkerToastContainer, GenericFallback, appkitTranslations } = imports.use(
        ['ResetDialog', 'ServiceWorkerToastContainer', 'GenericFallback', 'appkitTranslations'],
        '@dxos/react-appkit',
      );

      const types = imports.use('types', './proto');

      const swToast = () => plate`<${ServiceWorkerToastContainer} {...serviceWorker} />`;

      const coreContent = plate`
      <ErrorBoundary fallback={({ error }) => <${ResetDialog} error={error} config={config} />}>
        <${ClientProvider}
          config={config}${dxosUi ? plate`
          fallback={${GenericFallback}}` : ''}
          onInitialized={async (client) => {
            ${proto && plate`client.addSchema(${types});`}
            const searchParams = new URLSearchParams(location.search);
            if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
              await client.halo.createIdentity();
            }
          }}
        >
          ${slots.content}
          ${dxosUi && pwa && swToast}
        </${ClientProvider}>
      </ErrorBoundary>`;

      // TODO(wittjosiah): Generic fallback is missing translations.
      const themeProvider = (content: string) => plate`
      <${ThemeProvider} appNs='${name}' resourceExtensions={[${appkitTranslations}]} fallback={<${GenericFallback} />}>
        ${content}
      </${ThemeProvider}>
      `;

      return (
        react &&
        plate`
        import React from 'react';
        ${imports}
        import { ErrorBoundary } from './ErrorBoundary';
        
        ${slots.extraImports}
        
        // Dynamics allows configuration to be supplied by the hosting KUBE.
        const config = async () => new ${Config}(await ${Dynamics}(), ${Local}(), ${Defaults}());

        export const App = () => {
          ${pwa && plate`const serviceWorker = ${useRegisterSW}();`}
          return (
            ${dxosUi ? themeProvider(coreContent) : coreContent}
          )
        }`
      );
    },
  });
