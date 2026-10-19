//
// Copyright 2025 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Skill from '@dxos/compute/Skill';
import { useAttention } from '@dxos/react-ui-attention';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { TemplateEditor } from '#components';

export type SkillArticleProps = AppSurface.ObjectArticleProps<Skill.Skill>;

export const SkillArticle = ({ role, attendableId, subject }: SkillArticleProps) => {
  const { hasAttention } = useAttention(attendableId);

  return (
    <Panel.Root role={role} width='document'>
      <Panel.Header>
        <Toolbar.Root inactive={!hasAttention} />
      </Panel.Header>
      <Panel.Body asChild>
        <TemplateEditor id={subject.id} source={subject.instructions.source} />
      </Panel.Body>
    </Panel.Root>
  );
};

SkillArticle.displayName = 'SkillArticle';
