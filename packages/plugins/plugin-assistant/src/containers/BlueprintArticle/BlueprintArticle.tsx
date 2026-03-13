//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { Panel, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '../../components';

export type BlueprintArticleProps = SurfaceComponentProps<Blueprint.Blueprint>;

export const BlueprintArticle = ({ role, subject }: BlueprintArticleProps) => {
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());

  return (
    <Panel.Root role={role} classNames='dx-article'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} />
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={subject.id} template={subject.instructions} />
      </Panel.Content>
    </Panel.Root>
  );
};
