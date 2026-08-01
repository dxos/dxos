//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.connector',
    name: 'Connections',
    author: 'DXOS',
    description: trim`
      Connects DXOS Composer workspaces to external services. A Connector is the
      reusable driver for a service; a Connection is the durable authenticated
      instance (a name, the connector id, and a Ref to an AccessToken stored in
      ECHO). One connector can back many connections (multi-account), and each
      connection sources one or more sync Cursors — a remote target paired with
      a local ECHO root object — that carry per-cursor sync state.

      Other plugins register themselves as Connector capability entries,
      describing their OAuth scopes, target-discovery and sync operations, how to
      materialize a target, and an optional credential form. The plugin renders a
      generic UI that adapts to whichever connectors are loaded: a connector
      picker (reuse an existing connection or create a new one), a sync-target
      checklist after authentication, and a Connection article that shows
      per-binding sync status.

      Authentication supports three paths: an OAuth popup flow (default), a
      redirect flow for providers that nullify window.opener (e.g. AT Protocol),
      and a custom-token or pre-flight form for non-OAuth credentials. Pending
      OAuth state is kept in memory and mirrored to localStorage so the redirect
      path can recover across tab boundaries.

      ECHO writes happen only after authentication succeeds: the AccessToken and
      Connection are persisted together, the connector's onTokenCreated hook
      fires, and Composer navigates to the new Connection. Cursor reconciliation
      is non-destructive, preserving existing sync cursors and options for
      targets that remain selected.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-connector',
    tags: ['system'],
    spec: 'PLUGIN.mdl',
  },
});
