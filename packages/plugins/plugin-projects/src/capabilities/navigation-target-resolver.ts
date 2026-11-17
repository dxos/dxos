//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as Chat from '@dxos/assistant/Chat';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Database, Entity, Obj } from '@dxos/echo';
import { DXN, EID } from '@dxos/keys';
import { ViewState } from '@dxos/react-ui-attention/types';
import * as Position from '@dxos/util/Position';

import { ProjectView } from '#types';

import { artifacts } from '../artifacts.ts';
import { getProjectArtifactPath, getProjectChatPath } from '../paths.ts';
import * as ProjectGraph from '../ProjectGraph.ts';

/**
 * Places a project's chats on its Chats branch, the artifacts it is parent of on its Artifacts branch, and its specs on
 * the project itself, since a spec has no node of its own; a spec's target opens the project on its Specs tab showing it. Without this a project chat resolves only to the assistant's
 * Chats section, whose connector queries unparented chats — so the path names a node that does not exist and opening it
 * leaves a blank pane.
 *
 * `Position.first`: the branch is where the tree shows the object as its own, so it outranks both the type section's
 * answer and the generic database subtree.
 */
export const resolveNavigationTarget: AppCapabilities.NavigationTargetResolver = (query) =>
  Effect.gen(function* () {
    if (!query?.uri) {
      return [];
    }
    const targetUri = EID.tryParse(query.uri) ?? DXN.tryMake(query.uri);
    if (!targetUri) {
      return [];
    }

    const { db } = yield* Database.Service;
    const object = yield* Database.load(db.makeRef(targetUri)).pipe(Effect.catch(() => Effect.succeed(null)));
    if (!object || !Obj.isObject(object)) {
      return [];
    }

    const project = Obj.getParent(object);
    if (!project || !Obj.instanceOf(Project.Project, project)) {
      return [];
    }

    const target = Obj.instanceOf(Chat.Chat, object)
      ? { path: getProjectChatPath(db.spaceId, project.id, object.id) }
      : Obj.instanceOf(Spec.Spec, object)
        ? {
            path: ProjectGraph.getProjectPath(db.spaceId, project.id),
            viewState: [ViewState.patch(ProjectView.aspect, Obj.getURI(project), { tab: 'spec', spec: object.id })],
          }
        : ContainerModel.includes(artifacts(project), object)
          ? { path: getProjectArtifactPath(db.spaceId, project.id, object.id) }
          : undefined;
    if (!target) {
      return [];
    }

    return [
      {
        ...target,
        label: Entity.getLabel(object) ?? '',
        type: Obj.getTypename(object)!,
        position: Position.first,
      },
    ];
  });

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(AppCapabilities.NavigationTargetResolver, resolveNavigationTarget);
  }),
);
