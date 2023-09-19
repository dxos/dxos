import { plate } from '@dxos/plate';
import template from '../template.t';

// for some reason ts-node doesn't lile to load this
// file if it is named __pwa.d.ts.t.ts
// workaround is to name it __pwa-d.ts.t.ts and emit a path in template.define.text

export default template.define.text({
  path: 'src/__pwa.d.ts',
  content: ({ input: { pwa } }) =>
    pwa &&
    plate`
    // TODO(wittjosiah): Including 'vite-plugin-pwa/client' in tsconfig types breaks react typing.
    // Taken from https://github.com/vite-pwa/vite-plugin-pwa/blob/bc3fab15d0b73994c57435ee13d7d9ce8c18cd55/client.d.ts.

    declare module 'virtual:pwa-register/react' {
      // eslint-disable-next-line
      // @ts-ignore ignore when react is not installed
      import type { Dispatch, SetStateAction } from 'react';

      export interface RegisterSWOptions {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        /**
         * Called only if 'onRegisteredSW' is not provided.
         *
         * @deprecated Use 'onRegisteredSW' instead.
         * @param registration The service worker registration if available.
         */
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
        /**
         * Called once the service worker is registered (requires version '0.12.8+').
         *
         * @param swScriptUrl The service worker script url.
         * @param registration The service worker registration if available.
         */
        onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: any) => void;
      }

      export function useRegisterSW(options?: RegisterSWOptions): {
        needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
        offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
      };
    }`,
});
