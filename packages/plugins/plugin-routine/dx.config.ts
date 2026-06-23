//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.routine',
    name: 'Routine',
    author: 'DXOS',
    description: trim`
      Event-driven workflow automation engine for DXOS Composer.
      A Routine pairs a trigger ("when" — a timer schedule or an incoming feed) with an action
      ("then" — a persistent compute operation and instructions), enabling automated pipelines that
      react to changes in real time without manual intervention.

      Routines are configured in their own article and surfaced on a per-object "Routines" companion
      that lists the routines connected to each object. A per-space TriggerDispatcher manages
      execution: running locally in the browser when computeEnvironment is "local", or delegating to
      the DXOS edge for server-side reliability; the space settings page chooses the runtime location.

      Operation handlers and blueprints contributed by any plugin in the application are
      automatically merged and made available to every space's OperationRegistry, so new
      capabilities registered by other plugins become instantly invocable from routines.
    `,
    icon: { key: 'ph--atom--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-routine',
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
