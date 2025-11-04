//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

export const TemplateContainer = ({ object }: { object: Obj.Any; role: string }) => (
  <StackItem.Content>
    <pre className='m-4 p-2 ring'>
      <span>{fullyQualifiedId(object)}</span>
    </pre>
  </StackItem.Content>
);
