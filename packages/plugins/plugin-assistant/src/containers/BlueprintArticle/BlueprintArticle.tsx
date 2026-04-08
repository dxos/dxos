//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit';
import { type Blueprint } from '@dxos/blueprints';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '#components';

export type BlueprintArticleProps = AppSurface.AttendableObjectProps<Blueprint.Blueprint>;

export const BlueprintArticle = ({ role, attendableId, subject }: BlueprintArticleProps) => {
  const { hasAttention } = useAttention(attendableId);

  return (
    <Panel.Root role={role} classNames='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={subject.id} template={subject.instructions} />
      </Panel.Content>
    </Panel.Root>
  );
};
