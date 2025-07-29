//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Template } from '@dxos/blueprint';
import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';

export type TemplateContainerProps = {
  template: Template.Template;
};

export const TemplateContainer = ({ template }: TemplateContainerProps) => {
  return (
    <StackItem.Content classNames='container-max-width'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
