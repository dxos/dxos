import { plate } from '@dxos/plate';
import template from '../template.t';

export default template.define
  .slots({
    content: '<p>Your code goes here</p>',
    extraImports: '',
  })
  .script({
    content: ({ input, slots, imports }) => {
      const { react, pwa, dxosUi, name, schema } = input;
      const { ClientProvider, Config, Defaults, Local } = imports.use(
        ['ClientProvider', 'Config', 'Dynamics', 'Defaults', 'Local'],
        '@dxos/react-client',
      );
      const { Status, ThemeProvider } = imports.use(['Status', 'ThemeProvider'], '@dxos/react-ui');
      const defaultTx = imports.use('defaultTx', '@dxos/react-ui-theme');
      const useRegisterSW = imports.use('useRegisterSW', 'virtual:pwa-register/react');

      const types = imports.use('types', './proto');
      const ServiceWorkerToast = imports.use('ServiceWorkerToast', './ServiceWorkerToast');
      const translations = imports.use('translations', './translations', { isDefault: true });

      const swToast = () => plate`
        {variant && <${ServiceWorkerToast} variant={variant} updateServiceWorker={updateServiceWorker} />}`;

      const coreContent = plate`
      ${dxosUi && pwa && swToast}
      <ErrorBoundary>
        <${ClientProvider}
          config={config}
          createWorker={createWorker}
          shell='./shell.html'
          ${dxosUi ? plate`fallback={Loader}` : ''}
          onInitialized={async (client) => {
            ${schema && plate`// client.addSchema(Task);`}
            const searchParams = new URLSearchParams(location.search);
            if (!client.halo.identity.get() && !searchParams.has('deviceInvitationCode')) {
              await client.halo.createIdentity();
            }
          }}
        >
          ${slots.content}
        </${ClientProvider}>
      </ErrorBoundary>`;

      const themeProvider = (content: string) => plate`
      <${ThemeProvider} appNs='${name}' tx={${defaultTx}} resourceExtensions={${translations}} fallback={<Loader />}>
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
        
        const config = async () => new ${Config}(${Local}(), ${Defaults}());

        const createWorker = () =>
          new SharedWorker(new URL('./shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          });

        ${
          dxosUi &&
          plate`
        const Loader = () => (
          <div className='flex bs-[100dvh] justify-center items-center'>
            <${Status} indeterminate aria-label='Initializing' />
          </div>
        );`
        }

        export const App = () => {
          ${
            pwa &&
            plate`
          const {
            needRefresh: [needRefresh],
            offlineReady: [offlineReady],
            updateServiceWorker,
          } = ${useRegisterSW}();
          const variant = needRefresh ? 'needRefresh' : offlineReady ? 'offlineReady' : undefined;`
          }

          return (
            ${dxosUi ? themeProvider(coreContent) : coreContent}
          )
        };`
      );
    },
  });
