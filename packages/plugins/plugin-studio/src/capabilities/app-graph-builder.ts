//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode, AppNodeMatcher, Paths } from '@dxos/app-toolkit';
import { isSpace } from '@dxos/client/echo';
import { Filter } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { Artifact } from '#types';

import {
  ARTIFACTS_NODE_DATA,
  ARTIFACTS_NODE_TYPE,
  ARTIFACTS_SEGMENT,
  STUDIO_SECTION_TYPE,
  STUDIO_SEGMENT,
  getKindIcon,
} from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      /**
       * Contributes the Studio navtree entry: a "Studio" section under the `content` group (always
       * present, so it is the create hub) with a virtual "Artifacts" child node that opens the
       * ArtifactsArticle. Mirrors plugin-inbox's Mailboxes section + virtual Drafts/Topics nodes.
       */
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
        url: { key: 'studio', kind: 'item', path: [Paths.GroupSegments.content, STUDIO_SEGMENT] },
        match: (node) => {
          const space = isSpace(node.properties.space) ? node.properties.space : undefined;
          return node.type === STUDIO_SECTION_TYPE && space ? Option.some(space) : Option.none();
        },
        // The virtual "Artifacts" node opens the browse/create hub and lists the space's Artifacts as
        // navigable children (each routes to its ArtifactArticle via the object-article surface).
        connector: (space, get) => {
          const artifacts = get(space.db.query(Filter.type(Artifact.Artifact)).atom);
          return Effect.succeed([
            Node.make({
              id: ARTIFACTS_SEGMENT,
              type: ARTIFACTS_NODE_TYPE,
              data: ARTIFACTS_NODE_DATA,
              properties: {
                label: ['artifacts.label', { ns: meta.profile.key }],
                icon: 'ph--images--regular',
                iconHue: 'purple',
                space,
                role: 'branch',
              },
              nodes: artifacts
                .map((artifact: Artifact.Artifact) => {
                  const node = AppNode.makeObject({ get, db: space.db, object: artifact });
                  // Show the kind's icon (image/video) rather than the generic Artifact-type glyph.
                  return node
                    ? { ...node, properties: { ...node.properties, icon: getKindIcon(artifact.kind) } }
                    : null;
                })
                .filter((node): node is NonNullable<typeof node> => node !== null),
            }),
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
