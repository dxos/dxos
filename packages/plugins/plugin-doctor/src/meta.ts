//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: 'org.dxos.plugin.doctor',
  name: 'Doctor',
  description: trim`
    Self-introspection blueprint that lets the assistant query Composer's own
    NDJSON log store to diagnose problems and explain unexpected behavior.
  `,
  icon: 'ph--first-aid-kit--regular',
  iconHue: 'rose',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-doctor',
};
