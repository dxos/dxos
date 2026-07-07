//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.freeq',
    name: 'Freeq',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-freeq',
    spec: 'PLUGIN.mdl',
    description: trim`
      Integrates freeq — an IRCv3 chat service that authenticates users via AT
      Protocol / Bluesky identities — as a live channel backend for the DXOS
      Composer thread plugin. The plugin connects to a freeq server over
      WebSocket, authenticates over the ATPROTO-CHALLENGE SASL mechanism, joins
      an IRC channel, streams inbound messages in real time, and sends outbound
      messages from the Composer composer.

      Messages are transient: live messages are held in memory for the session
      and channel history is backfilled from freeq's read-only REST API on join.
      A single WebSocket is shared across every Composer channel that targets the
      same server and identity.
    `,
    icon: { key: 'ph--dog--regular', hue: 'amber' },
    tags: ['labs', 'integration'],
  },
});
