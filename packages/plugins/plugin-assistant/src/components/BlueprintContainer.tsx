//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Blueprint } from '@dxos/blueprints';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';

export type BlueprintContainerProps = {
  blueprint: Blueprint.Blueprint;
};

export const BlueprintContainer = ({ blueprint }: BlueprintContainerProps) => {
  const { hasAttention } = useAttention(fullyQualifiedId(blueprint));

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} />
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
