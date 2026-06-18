//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.integration',
    name: 'Integrations',
    description: trim`
      Manages connections to external services for DXOS Composer workspaces.
      OAuth credentials and API tokens are stored as AccessToken objects in ECHO
      and organised into Integration records that each carry one or more sync
      targets (a remote foreign id paired with a local ECHO root object).

      Other plugins register themselves as IntegrationProvider capability entries,
      describing their OAuth scopes, target-discovery operation, incremental sync
      operation, and optional credential form. The plugin renders a generic UI
      that adapts automatically to however many providers are currently loaded:
      a provider-picker dropdown in the create form, a sync-target checklist after
      authentication, and an Integration article that shows per-target sync status.

      Authentication supports three paths: an OAuth popup flow (default), a
      redirect flow for providers that nullify window.opener (e.g. AT Protocol),
      and a custom-token or pre-flight form for non-OAuth credentials. Pending
      OAuth state is kept in memory and mirrored to localStorage so the redirect
      path can recover across tab boundaries.

      ECHO writes happen only after authentication succeeds: AccessToken and
      Integration are persisted together, the provider's onTokenCreated hook
      fires, and Composer navigates to the new Integration article. The
      SetIntegrationTargets operation reconciles target selections
      non-destructively, preserving existing sync cursors and options for
      targets that remain selected.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-integration',
    tags: ['system'],
    spec: 'PLUGIN.mdl',
  },
});
