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
      const { ClientProvider, Config, Defaults, Local } = imports.use(
        ['ClientProvider', 'Config', 'Dynamics', 'Defaults', 'Local'],
        '@dxos/react-client',
      );
      const { Status, ThemeProvider }  = imports.use(['Status', 'ThemeProvider'], '@dxos/react-ui');
      const useRegisterSW = imports.use('useRegisterSW', 'virtual:pwa-register/react');

      const types = imports.use('types', './proto');
      const ServiceWorkerToast = imports.use('ServiceWorkerToast', './ServiceWorkerToast');
      const translations = imports.use('translations', './translations');

      const swToast = () => plate`<${ServiceWorkerToast} {...serviceWorker} />`;

      const coreContent = plate`
      <ErrorBoundary>
        <${ClientProvider}
          config={config}
          createWorker={createWorker}${dxosUi ? plate`
          fallback={Loader}` : ''}
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

      const themeProvider = (content: string) => plate`
      <${ThemeProvider} appNs='${name}' resourceExtensions={[${translations}]} fallback={<Loader />}>
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
        
        const config = () => new ${Config}(${Local}(), ${Defaults}());

        const createWorker = () =>
          new SharedWorker(new URL('./shared-worker', import.meta.url), {
            type: 'module',
            name: 'dxos-client-worker',
          });

        ${dxosUi && plate`
        const Loader = () => {
          const { t } = useTranslation('${name}');
          return (
            <div className='py-8 flex flex-col gap-4' aria-live='polite'>
              <${Status} indeterminate aria-label='Initializing' />
              <p className='text-lg font-light text-center'>
                {t('loading label')}
              </p>
            </div>
          );
        };`}

        export const App = () => {
          ${pwa && plate`const serviceWorker = ${useRegisterSW}();`}
          return (
            ${dxosUi ? themeProvider(coreContent) : coreContent}
          )
        };`
      );
    },
  });
