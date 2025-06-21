//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem, type StackItemContentProps } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { type TemplateType } from '../types';

export const TemplateContainer = ({
  role,
  template,
}: Pick<StackItemContentProps, 'role'> & { template: TemplateType }) => {
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
