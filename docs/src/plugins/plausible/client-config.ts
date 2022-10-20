//
// Copyright 2022 DXOS.org
//

import { defineClientConfig } from '@vuepress/client';

declare global {
  interface Window {
    DOMAIN: string
    SELF_HOSTED_URL: string
    OUTBOUND_LINKS: string
  }
}

// https://vuepress.github.io/advanced/cookbook/usage-of-client-config.html
export default defineClientConfig({
  // Based on https://github.com/spekulatius/vuepress-plugin-plausible/blob/master/inject.js
  enhance: () => {
    if (
      // only in production
      process.env.NODE_ENV === 'production' &&
      // and we are ready
      typeof window !== 'undefined' &&
      // only if we got the domain
      window.DOMAIN
    ) {
      (() => {
        const d = document;
        const g = d.createElement('script');
        const s = d.getElementsByTagName('script')[0];
        const h = window.OUTBOUND_LINKS
          ? window.SELF_HOSTED_URL + '/js/plausible.outbound-links.js'
          : window.SELF_HOSTED_URL + '/js/plausible.js';

        g.setAttribute('data-domain', window.DOMAIN);
        g.async = true;
        g.defer = true;
        g.src = h;
        s.parentNode?.insertBefore(g, s);
      })();
    }
  }
});
