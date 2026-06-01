//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.github'),
  name: 'GitHub',
  author: 'DXOS',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-github',
  spec: 'PLUGIN.mdl',
  description: trim`
    Connect GitHub to your Composer workspace so organizations, repositories,
    issues, and pull requests stay available alongside everything else you're
    working on.

    Authenticate with a GitHub OAuth App or GitHub App and select the
    repositories you want to track.  On each sync pass the plugin pulls
    organizations and their members into ECHO as Organization and Person
    objects, and mirrors every repository as a Project and every issue or
    pull request as a Task — with open mapping to "todo" and closed mapping
    to "done".

    Edits made locally to issue title, description, or open/closed status
    are pushed back to GitHub via a snapshot-diff reconciliation step, so
    changes flow in both directions.  Pull request status is deliberately
    pull-only to avoid accidental closes; repo renames are similarly guarded.

    All GitHub data is stored in ECHO and replicated to other peers in the
    space, giving the whole team a shared, local-first view of the project
    without requiring each member to hold their own GitHub token.
  `,
  icon: 'ph--github-logo--regular',
  iconHue: 'neutral',
  tags: ['labs', 'integration'],
});
