//
// Copyright 2022 DXOS.org
//

import { defineClientConfig } from '@vuepress/client';
import { onMounted } from 'vue';
import { isNavigationFailure, useRouter } from 'vue-router';

import { init, page } from '@dxos/telemetry';

const DX_ENVIRONMENT = process.env.DX_ENVIRONMENT ?? 'development';
const DX_RELEASE = process.env.DX_RELEASE ?? 'development';

// https://vuepress.github.io/advanced/cookbook/usage-of-client-config.html
export default defineClientConfig({
  setup: () => {
    onMounted(() => {
      if (!process.env.SEGMENT_API_KEY) {
        return;
      }

      const router = useRouter();

      init({ apiKey: process.env.SEGMENT_API_KEY });
      page({
        properties: {
          environment: DX_ENVIRONMENT,
          release: DX_RELEASE
        }
      });

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
    });
  }
});
