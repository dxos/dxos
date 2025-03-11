//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { TemplateEditor } from './TemplateEditor';
import { type TemplateType } from '../types';

// TODO(burdon): Attention.
export const TemplateContainer = ({ template, role }: { template: TemplateType; role: string }) => {
  return (
    <StackItem.Content toolbar={false} role={role} classNames='mli-auto w-full max-w-[50rem]'>
      <TemplateEditor template={template} />
    </StackItem.Content>
  );
};

export default TemplateContainer;
