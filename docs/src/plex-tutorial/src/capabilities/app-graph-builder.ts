//
// Copyright 2026 DXOS.org
//

// #region imports
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as TypeSection from '@dxos/app-toolkit/TypeSection';
import * as Operation from '@dxos/compute/Operation';
import { Obj, Ref } from '@dxos/echo';

import { StashNamespace } from '../namespace.ts';
import { StashedLink } from '../types/StashedLink.ts';
import { MarkRead } from '../types/StashedLinkOperation.ts';
// #endregion

// #region section
/** A "Stashed links" section in each space's Content group, once it has one. */
const section = TypeSection.createTypeSectionExtension(StashedLink, {
  match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.content),
  groupSegment: GraphPath.GroupSegments.content,
  // The link's address in Composer's URL: `/w/<space>/stash/<id>`.
  urlKey: 'stash',
});
// #endregion

// #region actions
/** An action on every link, on its toolbar and its menu in the tree. */
const stashedLinkActions = AppGraphBuilder.createTypeExtension({
  id: 'stashedLinkActions',
  type: StashedLink,
  actions: (link) =>
    Effect.succeed([
      {
        id: 'markRead',
        data: () =>
          Operation.invoke(
            MarkRead,
            { link: Ref.make(link) },
            { spaceId: Obj.getDatabase(link)?.spaceId },
          ),
        properties: {
          label: ['mark-read.label', { ns: StashNamespace.key }],
          icon: 'ph--check-circle--regular',
          disposition: ['toolbar', 'list-item'],
        },
      },
    ]),
});
// #endregion

// #region module
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([section, stashedLinkActions]);
    return Capability.contribute(
      AppCapabilities.AppGraphBuilder,
      extensions.flat(),
    );
  }),
);
// #endregion
