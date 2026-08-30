//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import { Chat } from '@dxos/assistant-toolkit';
import * as Project from '@dxos/compute/Project';
import { Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { ObjectMasonryArticle } from '@dxos/plugin-space/containers';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type ProjectBranchArticleProps = {
  role?: string;
  project: Project.Project;
  attendableId: string;
};

/**
 * The Chats branch as a grid of cards, the way a database type node shows its objects — the branch
 * stands for a set, and selecting it should show that set rather than only expand the tree.
 */
export const ProjectChatsArticle = ({ role, project, attendableId }: ProjectBranchArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(project);
  // The same membership rule the branch's connector uses: a project's chats are its ECHO children.
  const children = useQuery(db, Query.select(Filter.id(project.id)).children());
  const chats = useMemo(() => children.filter(Obj.instanceOf(Chat.Chat)), [children]);

  return (
    <ObjectMasonryArticle
      role={role}
      attendableId={attendableId}
      objects={chats}
      emptyMessage={t('chats-empty.message')}
    />
  );
};

/**
 * The Artifacts branch as a grid of cards. Membership is the project's `artifacts` ref array, and
 * the objects are queried by id rather than read off `ref.target`: on a cold load the targets are
 * not in memory yet, and a sync read would leave the grid permanently empty.
 */
export const ProjectArtifactsArticle = ({ role, project, attendableId }: ProjectBranchArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(project);
  const ids = useMemo(
    () =>
      project.artifacts.flatMap((ref) => {
        const uri = EID.tryParse(ref.uri);
        const entityId = uri && EID.getEntityId(uri);
        return entityId ? [entityId] : [];
      }),
    [project.artifacts],
  );
  const artifacts = useQuery(ids.length > 0 ? db : undefined, Filter.id(...ids));

  return (
    <ObjectMasonryArticle
      role={role}
      attendableId={attendableId}
      objects={artifacts}
      emptyMessage={t('artifacts-empty.message')}
    />
  );
};

ProjectChatsArticle.displayName = 'ProjectChatsArticle';
ProjectArtifactsArticle.displayName = 'ProjectArtifactsArticle';
