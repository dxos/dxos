//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Skill from '@dxos/compute/Skill';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

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
