//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Topic } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

/**
 * Surfaces all `Topic` objects in a space as a dedicated sidebar section — a root node plus a child per
 * `Topic`, each opening via the regular object/article surface (`TopicArticle`). The section's label and
 * icon derive from the `Topic` schema annotations; it is suppressed when the space has no topics. The
 * header `+` action creates a new Topic (via the `CreateObject` capability).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* TypeSection.createTypeSectionExtension(Topic.Topic, {
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          typename: Type.getTypename(Topic.Topic),
          targetNodeId: Paths.getSpacePath(space.db.spaceId, Type.getTypename(Topic.Topic)),
        }),
    });
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
