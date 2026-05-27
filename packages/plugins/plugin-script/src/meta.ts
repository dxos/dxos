//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.script'),
  name: 'Scripts',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    Write, deploy, and run custom TypeScript functions as ECHO objects directly inside your Composer spaces.
    Scripts execute on the Cloudflare Workers-based EDGE runtime and have access to the full DXOS SDK,
    Effect-TS, and a curated set of third-party libraries including HTTP, JSON, CSV, and date utilities.
    An AI Script assistant wires CRUD, deploy, invoke, and invocation-inspection operations as tools
    so an agent can scaffold, iterate, and test functions entirely within a chat session.
  `,
  icon: 'ph--code--regular',
  iconHue: 'sky',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
  tags: ['labs'],
  screenshots: ['https://dxos.network/plugin-details-scripts-dark.png'],
};

// TODO(ZaymonFC): Configure by scopes?
export const defaultScriptsForIntegration: Record<string, string[]> = {
  // TODO(wittjosiah): Also include content extraction scripts in the default set.
  'gmail.com': [DXN.make('org.dxos.script.gmail')],
};
