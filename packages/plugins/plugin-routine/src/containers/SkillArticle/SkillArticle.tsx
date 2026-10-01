//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Skill from '@dxos/compute/Skill';
import { useAttention } from '@dxos/react-ui-attention';
import { Next } from '@dxos/react-ui/next';

import { TemplateEditor } from '#components';

export type SkillArticleProps = AppSurface.ObjectArticleProps<Skill.Skill>;

export const SkillArticle = ({ role, attendableId, subject }: SkillArticleProps) => {
  const { hasAttention } = useAttention(attendableId);

  return (
    <Next.Panel.Root role={role} width='document'>
      <Next.Panel.Header>
        <Next.Toolbar.Root inactive={!hasAttention} />
      </Next.Panel.Header>
      <Next.Panel.Body asChild>
        <TemplateEditor id={subject.id} source={subject.instructions.source} />
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};

SkillArticle.displayName = 'SkillArticle';
