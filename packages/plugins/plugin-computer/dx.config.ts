//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.computer',
    name: 'Coding (Dev)',
    author: 'DXOS',
    description: trim`
      PROOF OF CONCEPT — DEV ONLY. Works only in a Composer served by a vite dev server,
      whose working directory is the tree the tools operate on. In any deployed build there
      is no dev server, so both tools fail with a configuration error.

      A minimal coding harness for the assistant: a bash tool and a multi-string-replace
      edit tool that run on the developer's own machine.

      Both tools are carried by a single dev-server route — one POST that runs a shell
      script under the server's own root and returns stdout, stderr and the exit code. The
      root scopes where a script starts; it does not sandbox the shell, so treat the
      harness as a terminal left open on your own checkout.

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
