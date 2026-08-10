//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.atproto',
    name: 'ATProto',
    author: 'DXOS',
    description: trim`
    A generic publishing companion for the AT Protocol. It appears beside any ECHO object whose type
    carries an atproto record annotation, when the space holds an atproto connection.

    The companion shows the object's public projection — which fields the network will see and which
    stay private — the publish/sync status, and actions to publish, re-publish, and unpublish the
    record on the user's PDS. It is driven entirely by the type annotation, so any content plugin can
    opt in without depending on this plugin.
  `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-atproto',
    icon: { key: 'ph--broadcast--regular', hue: 'sky' },
    spec: 'PLUGIN.mdl',
    screenshots: [],
    tags: ['system'],
  },
});
