//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';

import { IMPORT_PULL_REQUEST_DIALOG, meta } from '#meta';
import { GitHubOperation } from '#types';

/**
 * Contributes "Import pull request" to the root, so the commands dialog carries it: a reviewer who
 * has a link in hand should not have to sync a repository to read the change.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* AppGraphBuilder.createExtension({
      id: 'importPullRequest',
      match: GraphNodeMatcher.whenRoot,
      actions: () =>
        Effect.succeed([
          AppGraphNode.makeAction({
            id: GitHubOperation.ImportPullRequest.meta.key,
            data: Effect.fnUntraced(function* () {
              yield* Operation.invoke(LayoutOperation.UpdateDialog, {
                subject: IMPORT_PULL_REQUEST_DIALOG,
                blockAlign: 'start',
              });
            }),
            properties: {
              label: ['import-pull-request.label', { ns: meta.profile.key }],
              icon: 'ph--git-pull-request--regular',
            },
          }),
        ]),
    });

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
