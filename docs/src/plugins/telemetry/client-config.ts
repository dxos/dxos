//
// Copyright 2022 DXOS.org
//

import { defineClientConfig } from '@vuepress/client';
import { isNavigationFailure } from 'vue-router';

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT ?? 'development';
const DX_RELEASE = process.env.DX_RELEASE ?? 'development';
const SEGMENT_API_KEY = process.env.SEGMENT_API_KEY;

// https://vuepress.github.io/advanced/cookbook/usage-of-client-config.html
export default defineClientConfig({
  enhance: async ({ router }) => {
    if (__VUEPRESS_SSR__ || !SEGMENT_API_KEY) {
      return;
    }

    const { init, page } = await import('@dxos/telemetry');
    init({ apiKey: SEGMENT_API_KEY });

    router.afterEach((to, from, failure) => {
      if (!isNavigationFailure(failure)) {
        page({
          properties: {
            environment: DX_ENVIRONMENT,
            release: DX_RELEASE
          }
        });
      }
    });
  }
});
