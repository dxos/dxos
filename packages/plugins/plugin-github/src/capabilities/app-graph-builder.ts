//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Annotation, Obj } from '@dxos/echo';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';
import { Task } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { PullRequestAnnotation } from '#types';

/**
 * Contributes a "Changes" companion to Tasks that back a GitHub pull request
 * (identified by the presence of {@link PullRequestAnnotation}). Plain issue
 * Tasks — and Tasks from other sources — are left untouched.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extension = yield* GraphBuilder.createExtension({
      id: 'pullRequestChanges',
      match: (node) =>
        Obj.instanceOf(Task.Task, node.data) && Option.isSome(Annotation.get(node.data, PullRequestAnnotation))
          ? Option.some(node)
          : Option.none(),
      connector: () =>
        Effect.succeed([
          AppNode.makeCompanion({
            id: linkedSegment('changes'),
            label: ['pull-request-changes.label', { ns: meta.profile.key }],
            icon: 'ph--git-diff--regular',
            data: 'changes',
            position: Position.last,
          }),
        ]),
    });

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extension);
  }),
);
