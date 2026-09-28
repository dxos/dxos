//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as CrxCapabilities from '@dxos/plugin-crx/CrxCapabilities';
import type * as PageAction from '@dxos/plugin-crx/PageAction';

import { meta } from '#meta';
import { GitHubOperation } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    // Typed array so the contribution is checked against CrxCapabilities.PageAction's value type.
    const actions: PageAction.PageAction[] = [
      {
        id: `${meta.profile.key}/page-action/open-pull-request`,
        label: 'Open PR in Composer',
        icon: 'ph--git-pull-request--regular',
        // `/pull/123` and anything below it (`/files`, `/commits`), which GitHub serves as the same
        // pull request.
        urlPatterns: ['https://github.com/*/*/pull/*'],
        extractor: { name: 'snapshot' },
        contexts: ['popup', 'picker'],
        operation: GitHubOperation.ImportPullRequestFromSnapshot,
      },
    ];
    return Capability.contribute(CrxCapabilities.PageAction, actions);
  }),
);
