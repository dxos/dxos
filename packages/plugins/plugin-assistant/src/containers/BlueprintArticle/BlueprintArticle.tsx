//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { Container, Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '../../components';

export type BlueprintArticleProps = SurfaceComponentProps<Blueprint.Blueprint>;

export const BlueprintArticle = ({ role, subject }: BlueprintArticleProps) => {
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());

  return (
    <Container.Main role={role} toolbar>
      <Toolbar.Root disabled={!hasAttention} />
      <TemplateEditor id={subject.id} template={subject.instructions} classNames='dx-container-max-width' />
    </Container.Main>
  );
};
