//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.labeler',
    name: 'Labeler',
    author: 'DXOS',
    description: trim`
      Labeler tags mailbox messages with the space's own tags. It asks a decision model three
      questions per message — does this need a reply, which label fits, how urgent is it — and
      applies the answers whose confidence clears a threshold, leaving the rest untouched.
      Contributes a toolbar action and a cascade pass to the inbox.
    `,
    icon: { key: 'ph--tag--regular', hue: 'purple' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-labeler',
    tags: ['labs'],
  },
});
