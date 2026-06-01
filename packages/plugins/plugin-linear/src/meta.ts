//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.linear'),
  name: 'Linear',
  author: 'DXOS',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-linear',
  spec: 'PLUGIN.mdl',
  description: trim`
    Integrates Linear into DXOS Composer, mirroring teams, projects, and issues as
    local-first objects that stay available alongside everything else in the workspace.
    The user selects Linear teams; the plugin pulls each team's projects as Project
    objects and its issues as Task objects keyed by their remote ids.

    Sync is bidirectional. The pull phase applies a snapshot-driven three-way merge
    per field: remote edits to untouched fields flow in, local edits to untouched
    fields are preserved, and on conflict the remote wins. The push phase diffs every
    locally-mirrored object against its snapshot and sends only the diverged fields,
    so read-only syncs produce no network traffic. Workflow states are fetched lazily
    and only when a status-change push is detected.

    Priority and status values are mapped through Linear's stable numeric codes and
    category constants rather than workspace-customisable display names, so renamed
    states continue to work. SyncOptions.maxDaysBack can limit how far back issues
    are pulled to keep initial syncs fast for large teams.

    Creating new local issues on Linear is not supported in v1; push covers edits to
    already-synced objects only. Per-target errors are isolated so a failure on one
    team does not prevent other teams from syncing.
  `,
  icon: 'ph--list-checks--regular',
  iconHue: 'neutral',
  tags: ['labs', 'integration'],
});
