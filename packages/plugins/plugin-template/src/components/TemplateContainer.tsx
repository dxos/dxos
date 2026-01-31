//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';

export type TemplateContainerProps = SurfaceComponentProps<Obj.Unknown>;

export const TemplateContainer = ({ role, subject: object }: TemplateContainerProps) => {
  return (
    <StackItem.Content>
      <pre className='m-4 p-2 ring'>
        <span>{Obj.getDXN(object).toString()}</span>
      </pre>
    </StackItem.Content>
  );
};
