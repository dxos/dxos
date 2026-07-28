//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNodeMatcher, GraphPath, TypeSection } from '@dxos/app-toolkit';
import { Operation, Project } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { SpaceOperation } from '@dxos/plugin-space';

import { meta } from '#meta';
import { ProjectOperation } from '#types';

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
    const sectionExtensions = yield* TypeSection.createTypeSectionExtension(Project.Project, {
      urlKey: 'topic',
      match: AppNodeMatcher.whenNavTreeGroup(GraphPath.GroupTypes.ai),
      groupSegment: GraphPath.GroupSegments.ai,
      createObject: (space) =>
        Operation.invoke(SpaceOperation.OpenCreateObject, {
          target: space.db,
          typename: Type.getTypename(Project.Project),
          targetNodeId: GraphPath.getSpacePath(
            space.db.spaceId,
            GraphPath.GroupSegments.ai,
            Type.getTypename(Project.Project),
          ),
        }),
    });

    const actionExtensions = yield* createProjectActionExtension();
    return Capability.contributes(AppCapabilities.AppGraphBuilder, [...sectionExtensions, ...actionExtensions]);
  }),
);

/**
 * Start a chat in project scope. Dispositioned for both surfaces so the one action serves the
 * project's navtree row and the `ProjectArticle` toolbar, which splices in graph actions.
 */
export const createProjectActionExtension = () =>
  GraphBuilder.createExtension({
    id: 'projectActions',
    match: (node) => (Obj.instanceOf(Project.Project, node.data) ? Option.some(node.data) : Option.none()),
    actions: (project) =>
      Effect.succeed([
        Node.makeAction({
          id: ProjectOperation.CreateChat.meta.key,
          data: () =>
            Effect.gen(function* () {
              const db = Obj.getDatabase(project);
              if (!db) {
                return;
              }

              yield* Operation.invoke(ProjectOperation.CreateChat, { project }, { spaceId: db.spaceId });
            }),
          properties: {
            label: ['create-chat.label', { ns: meta.profile.key }],
            icon: 'ph--chat-text--regular',
            disposition: ['toolbar', 'list-item-primary'],
            testId: 'projectsPlugin.createChat',
          },
        }),
      ]),
  });
