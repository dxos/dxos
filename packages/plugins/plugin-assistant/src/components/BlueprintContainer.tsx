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
    <StackItem.Content classNames='container-max-width'>
      <TemplateEditor id={blueprint.id} template={blueprint.instructions} />
    </StackItem.Content>
  );
};

export default BlueprintContainer;
