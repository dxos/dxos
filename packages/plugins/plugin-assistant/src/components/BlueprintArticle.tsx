//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';

export type BlueprintArticleProps = SurfaceComponentProps<Blueprint.Blueprint>;

export const BlueprintArticle = ({ subject }: BlueprintArticleProps) => {
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} />
      <TemplateEditor id={subject.id} template={subject.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default BlueprintArticle;
