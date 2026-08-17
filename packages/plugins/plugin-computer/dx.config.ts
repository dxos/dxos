//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.computer',
    name: 'Computer',
    author: 'DXOS',
    description: trim`
      A minimal coding harness for the assistant: a bash tool and a multi-string-replace
      edit tool that run on the developer's own machine.

      Both tools are carried by a single dev-server route — one POST that runs a shell
      script under a configured root and returns stdout, stderr and the exit code. The
      route is mounted by this package's vite plugin and only exists while a vite dev
      server is running, so a deployed Composer has no shell to reach: the tools fail
      with a configuration error rather than silently doing nothing.

      This is the in-app alternative to delegating a turn to an external agent harness —
      the assistant keeps its own loop, its own context and its own transcript, and gains
      the two tools that loop was missing.
    `,
    icon: { key: 'ph--terminal-window--regular', hue: 'amber' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-computer',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
