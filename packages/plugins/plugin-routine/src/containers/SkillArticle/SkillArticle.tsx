//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import type * as Skill from '@dxos/compute/Skill';
import { useResolveRef } from '@dxos/echo-react';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '#components';

export type SkillArticleProps = AppSurface.ObjectArticleProps<Skill.Skill>;

export const SkillArticle = ({ role, attendableId, subject }: SkillArticleProps) => {
  const { hasAttention } = useAttention(attendableId);
  // The editor reads `source.target` synchronously, which is `undefined` until the ref loads and
  // never re-renders on its own; this article is the memo boundary that would swallow the update.
  useResolveRef(subject.instructions.source);

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
