//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { type DataType } from '@dxos/schema';

export const ProjectContainer = ({ object }: { object: DataType.Project; role: string }) => {
  return (
    <StackItem.Content>
      <pre className='m-4 p-2 ring'>
        <span>{fullyQualifiedId(object)}</span>
      </pre>
    </StackItem.Content>
  );
};
