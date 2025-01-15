//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject, fullyQualifiedId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

export const TemplateContainer = ({ object }: { object: ReactiveEchoObject<any>; role: string }) => {
  return (
    <StackItem.Content toolbar={false}>
      <pre className='m-4 p-2 ring'>
        <span>{fullyQualifiedId(object)}</span>
      </pre>
    </StackItem.Content>
  );
};
