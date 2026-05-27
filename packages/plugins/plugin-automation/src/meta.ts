//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta: Plugin.Meta = {
  id: DXN.make('org.dxos.plugin.automation'),
  name: 'Automation',
  author: 'DXOS',
  description: trim`
    Event-driven workflow automation engine for DXOS Composer.
    Triggers connect ECHO objects, timer schedules, incoming feeds (email, webhook), and data
    subscriptions to persistent compute functions — enabling automated pipelines that react to
    changes in real time without manual intervention.

    Each trigger references a PersistentOperation (a compiled function derived from a Script or
    a visual ComputeGraph workflow) and carries optional structured input forwarded at invocation.
    A per-space TriggerDispatcher manages execution: running locally in the browser when
    computeEnvironment is "local", or delegating to the DXOS edge for server-side reliability.

    The AutomationPanel settings surface lets users create, configure, enable, disable, and
    force-run triggers from within any space. The TriggerEditor form supports all spec kinds —
    timer (cron), feed, subscription, email, and webhook — with a query builder for
    subscription-type triggers and a structured input editor for passing data to functions.

    Operation handlers and blueprints contributed by any plugin in the application are
    automatically merged and made available to every space's OperationRegistry, so new
    capabilities registered by other plugins become instantly invocable from automation triggers.
  `,
  icon: 'ph--atom--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-automation',
  spec: 'PLUGIN.mdl',
  tags: ['system'],
};
