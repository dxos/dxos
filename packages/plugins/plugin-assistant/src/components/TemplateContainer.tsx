//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { type TemplateType } from '../types';

export const TemplateContainer = ({ template, role }: { template: TemplateType; role: string }) => {
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
