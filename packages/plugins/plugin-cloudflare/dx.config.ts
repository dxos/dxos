//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.cloudflare',
    name: 'Cloudflare',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-cloudflare',
    spec: 'PLUGIN.mdl',
    description: trim`
      Connect a Cloudflare account to Composer.

      The plugin is headless: it contributes one Connector entry that runs the
      Cloudflare OAuth flow through EDGE and stores the resulting grant as an
      AccessToken under the source "cloudflare.com". Anything that resolves
      credentials through CredentialsService — an operation, an assistant tool,
      a downstream plugin — can then call the Cloudflare v4 API on the user's
      behalf without asking for a token of its own.

      The grant is a working one, not a read-only peek: Workers, KV, R2, D1,
      Queues, Pipelines, Vectorize, Hyperdrive, Secrets Store, Workers AI and
      Containers, alongside the account and user reads. Cloudflare attaches the
      refresh token from the client's grant, so EDGE can keep the connection
      alive without the connector asking for a scope to do it.
      The point is that a coding agent can say what it needs and then deploy and
      manage it, rather than walking the user through the dashboard.

      It syncs nothing into ECHO.
    `,
    icon: { key: 'ph--cloud--regular', hue: 'amber' },
    tags: ['labs', 'connector'],
  },
});
