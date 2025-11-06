//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';

export const TemplateContainer = ({ object }: { object: Obj.Any; role: string }) => {
  return (
    <StackItem.Content>
      <pre className='m-4 p-2 ring'>
        <span>{Obj.getDXN(object).toString()}</span>
      </pre>
    </StackItem.Content>
  );
};
