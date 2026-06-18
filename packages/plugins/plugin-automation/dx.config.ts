//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.automation',
    name: 'Automation',
    description: trim`
      Event-driven workflow automation engine for DXOS Composer.
      An Automation is a user-facing object pairing a trigger ("when" — a timer schedule or an
      incoming feed) with an action ("then" — a persistent compute operation or routine), enabling
      automated pipelines that react to changes in real time without manual intervention.

      Automations are configured in their own article and surfaced on a per-object "Automations"
      companion that lists the automations connected to each object. A per-space TriggerDispatcher
      manages execution: running locally in the browser when computeEnvironment is "local", or
      delegating to the DXOS edge for server-side reliability; the space settings page chooses the
      runtime location.

      Operation handlers and blueprints contributed by any plugin in the application are
      automatically merged and made available to every space's OperationRegistry, so new
      capabilities registered by other plugins become instantly invocable from automations.
    `,
    icon: { key: 'ph--atom--regular' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-automation',
    spec: 'PLUGIN.mdl',
    tags: ['system'],
  },
});
