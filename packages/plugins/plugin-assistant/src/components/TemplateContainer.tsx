//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { type TemplateType } from '../types';

export type TemplateContainerProps = {
  template: TemplateType;
};

export const TemplateContainer = ({ template }: TemplateContainerProps) => {
  return (
    <StackItem.Content classNames='container-max-width'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
