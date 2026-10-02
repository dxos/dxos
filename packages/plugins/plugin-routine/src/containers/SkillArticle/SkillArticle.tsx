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
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={subject.id} source={subject.instructions.source} />
      </Panel.Content>
    </Panel.Root>
  );
};

SkillArticle.displayName = 'SkillArticle';
