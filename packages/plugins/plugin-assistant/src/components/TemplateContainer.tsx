//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { type TemplateType } from '../types';

export type TemplateContainerProps = {
  role: string;
  template: TemplateType;
};

export const TemplateContainer = ({ role, template }: TemplateContainerProps) => {
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
