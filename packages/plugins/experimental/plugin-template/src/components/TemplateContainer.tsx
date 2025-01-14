//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/react-client';
import { type ReactiveEchoObject, getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

export const TemplateContainer = ({ object }: { object: ReactiveEchoObject<any>; role: string }) => {
  const space = getSpace(object);

  return (
    // TODO(burdon): Boilerplate.
    <StackItem.Content toolbar={false}>
      <pre className='m-4 p-2 ring'>
        <span>{fullyQualifiedId(object)}</span>
      </pre>
    </StackItem.Content>
  );
};
