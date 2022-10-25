//
// Copyright 2022 DXOS.org
//

import { defineClientConfig } from '@vuepress/client';
import { isNavigationFailure } from 'vue-router';

declare global {
  const __VUEPRESS_SSR__: boolean;
}

// https://vuepress.github.io/advanced/cookbook/usage-of-client-config.html
export default defineClientConfig({
  enhance: async ({ router }) => {
    if (__VUEPRESS_SSR__) {
      return;
    }

    const { init, page } = await import('@dxos/telemetry');
    init({ apiKey: 'qjDvCXeTYe1dhJy7GN8Oa1ePcdi05DlS' });

    const route = router.currentRoute.value;
    page({
      installationId: 'default',
      identityId: 'default',
      name: route.name?.toString() ?? route.path
    });

    router.afterEach((to, from, failure) => {
      if (!isNavigationFailure(failure)) {
        page({
          installationId: 'default',
          identityId: 'default',
          name: to.name?.toString() ?? to.path
        });
      }
    });
  }
});
