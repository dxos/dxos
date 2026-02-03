//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Layout } from '@dxos/react-ui-mosaic';

import { TemplateEditor } from './TemplateEditor';

export type BlueprintArticleProps = SurfaceComponentProps<Blueprint.Blueprint>;

export const BlueprintArticle = ({ role, subject }: BlueprintArticleProps) => {
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());

  return (
    <Layout.Main role={role} toolbar>
      <Toolbar.Root disabled={!hasAttention} />
      <TemplateEditor id={subject.id} template={subject.instructions} classNames='container-max-width' />
    </Layout.Main>
  );
};

export default BlueprintArticle;
