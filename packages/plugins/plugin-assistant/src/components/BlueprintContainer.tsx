//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Blueprint } from '@dxos/blueprints';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';

export type BlueprintContainerProps = {
  blueprint: Blueprint.Blueprint;
};

export const BlueprintContainer = ({ blueprint }: BlueprintContainerProps) => {
  return (
    <StackItem.Content>
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
