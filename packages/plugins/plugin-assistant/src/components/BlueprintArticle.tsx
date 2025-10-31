//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ArticleComponentProps } from '@dxos/app-framework';
import { type Blueprint } from '@dxos/blueprints';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';

export const BlueprintArticle = ({ object }: ArticleComponentProps<Blueprint.Blueprint>) => {
  const { hasAttention } = useAttention(fullyQualifiedId(object));

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} />
      <TemplateEditor id={object.id} template={object.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default BlueprintArticle;
