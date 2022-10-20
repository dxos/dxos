//
// Copyright 2022 DXOS.org
//

import path from 'node:path';
import type { Plugin } from 'vuepress';

export type PluginOptions = {
  domain?: string
  selfHostedUrl?: string
  outboundLinkTracking?: boolean
}

// Based on https://github.com/spekulatius/vuepress-plugin-plausible/blob/master/index.js
export const plausiblePlugin = ({
  domain,
  selfHostedUrl,
  outboundLinkTracking
}: PluginOptions = {}): Plugin => {
  return {
    name: 'plausible',
    define: (app, isServer) => {
      if (isServer) {
        return;
      }

      return {
        DOMAIN: domain ?? false,
        SELF_HOSTED_URL: selfHostedUrl ?? 'https://plausible.io',
        OUTBOUND_LINKS: outboundLinkTracking ?? false
      };
    },
    clientConfigFile: path.resolve(__dirname, './client-config.ts')
  };
};
