//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.trello',
    name: 'Trello',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-trello',
    spec: 'PLUGIN.mdl',
    description: trim`
      Integrates Trello into DXOS Composer, mirroring boards and cards as local-first
      Kanban objects that stay available alongside everything else in the workspace.
      Each Trello board the user selects is materialized as a Kanban keyed by its remote
      board id; individual cards become Expando objects inside the Kanban's items list.

      Sync is bidirectional. The pull phase applies a snapshot-driven three-way merge
      per field: remote edits to untouched fields flow in, local edits to untouched
      fields are preserved, and on conflict the remote wins. The push phase sends only
      the fields that diverged from the last-pull snapshot, so unmodified cards produce
      no network traffic.

      Credentials are stored as a colon-separated apiKey:userToken string in an
      AccessToken object inside the user's Integration. The OAuth callback in the
      companion kms-service writes this format so the plugin stays self-contained
      and no runtime environment variable is required.

      Board creation and board-rename push are not yet implemented in v1; sync
      focuses on card-level operations with per-target error isolation so a failure
      on one board does not prevent other boards from syncing.
    `,
    icon: { key: 'ph--kanban--regular', hue: 'blue' },
    tags: ['labs', 'integration'],
  },
});
