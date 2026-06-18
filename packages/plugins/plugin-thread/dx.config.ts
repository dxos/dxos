//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.thread',
    name: 'Threads',
    author: 'DXOS',
    description: trim`
      ThreadPlugin provides chat: channels backed by an ECHO feed and free-standing
      message threads. It renders the channel article and companion surfaces plus a
      thread surface, and contributes the operations that create a default channel on
      space creation, create new channels, and append messages.

      Channel messages are stored in the channel's feed queue and rendered newest-last
      with a pinned composer; externally-synced channels (carrying foreign-key
      metadata, e.g. Slack/Discord-sourced rooms) render read-only because there is no
      local-write path back to the source. Free-standing threads render their messages
      and append by pushing onto the thread's message list.

      The shared message and thread UI comes from @dxos/react-ui-thread; the Channel,
      Message, and Thread schema come from @dxos/types. Document comments and the
      comment-thread AI agent live in the @dxos/plugin-comments plugin.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-thread',
    icon: { key: 'ph--video-conference--regular', hue: 'rose' },
    spec: 'PLUGIN.mdl',
  },
});
