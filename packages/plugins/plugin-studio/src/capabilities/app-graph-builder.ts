//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';

import {
  ARTIFACTS_NODE_DATA,
  ARTIFACTS_NODE_TYPE,
  ARTIFACTS_SEGMENT,
  STUDIO_SECTION_TYPE,
  STUDIO_SEGMENT,
} from '../constants';

/**
 * Contributes the Studio navtree entry: a "Studio" section under the `content` group (always
 * present, so it is the create hub) with a virtual "Artifacts" child node that opens the
 * ArtifactsArticle. Mirrors plugin-inbox's Mailboxes section + virtual Drafts/Topics nodes.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'studioSection',
        match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.content),
        connector: (space) =>
          Effect.succeed([
            AppNode.makeSection({
              id: STUDIO_SEGMENT,
              type: STUDIO_SECTION_TYPE,
              label: ['studio-section.label', { ns: meta.profile.key }],
              icon: 'ph--paint-brush--regular',
              iconHue: 'purple',
              space,
              position: 350,
            }),
          ]),
      }),

      GraphBuilder.createExtension({
        id: 'studioArtifactsNode',
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === STUDIO_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        connector: (space) =>
          Effect.succeed([
            Node.make({
              id: ARTIFACTS_SEGMENT,
              type: ARTIFACTS_NODE_TYPE,
              data: ARTIFACTS_NODE_DATA,
              properties: {
                label: ['artifacts.label', { ns: meta.profile.key }],
                icon: 'ph--images--regular',
                iconHue: 'purple',
                space,
                role: 'leaf',
              },
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
