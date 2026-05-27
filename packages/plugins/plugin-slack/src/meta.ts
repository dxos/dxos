//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.slack'),
  name: 'Slack',
  author: 'DXOS',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-slack',
  spec: 'PLUGIN.mdl',
  description: trim`
    SlackPlugin connects a Slack workspace to DXOS Composer via OAuth so that
    channels and messages appear alongside documents, threads, and other
    collaborative objects in your space.

    After authorising with a Slack OAuth token the plugin discovers all public
    and private channels the token can access and presents them as selectable
    sync targets. No local objects are created until you choose which channels
    to track, keeping your space uncluttered.

    Selected channels are synced incrementally: on each run the plugin fetches
    only messages newer than the last cursor, maps them to standard
    \`@dxos/types\` Message objects (preserving thread relationships via
    \`threadId\`), and appends them to a per-channel ECHO feed. User and bot
    display names are resolved lazily via the Slack Web API and cached for the
    duration of each sync pass.

    Credentials are stored as an OAuth AccessToken in ECHO and accessed through
    an Effect Context service so they are never threaded through call sites.
    All Slack API calls use POST with \`application/x-www-form-urlencoded\`
    bodies to satisfy Slack's CORS constraints, and include automatic retry with
    exponential back-off for transient failures.
  `,
  icon: 'ph--slack-logo--regular',
  iconHue: 'purple',
  tags: ['labs', 'integration'],
};
