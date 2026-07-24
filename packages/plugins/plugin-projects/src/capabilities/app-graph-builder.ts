//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNodeMatcher, Paths, TypeSection } from '@dxos/app-toolkit';
import { Operation, Project } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

/**
 * Surfaces all `Project` objects in a space as a sidebar section nested under the assistant (AI) group —
 * a section root node plus a child per `Project`, each opening via the regular object/article surface
 * (`ProjectArticle`). The section's label and icon derive from the `Project` schema annotations; it is
 * suppressed when the space has no projects. The header `+` action creates a new Project (via the
 * `CreateObject` capability). Nesting under the AI group means the section only appears when the
 * assistant plugin is active (it owns the group node).
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* TypeSection.createTypeSectionExtension(Project.Project, {
      match: AppNodeMatcher.whenNavTreeGroup(Paths.GroupTypes.ai),
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          typename: Type.getTypename(Project.Project),
          targetNodeId: Paths.getSpacePath(space.db.spaceId, Paths.GroupSegments.ai, Type.getTypename(Project.Project)),
        }),
    });
    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
