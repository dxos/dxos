//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

export type TemplateContainerProps = SurfaceComponentProps<Obj.Unknown>;

export const TemplateContainer = ({ role, subject: object }: TemplateContainerProps) => {
  return (
    <Panel.Root role={role} className='dx-article'>
      <Panel.Content>
        <Panel.Content>
          <span>{Obj.getDXN(object).toString()}</span>
        </Panel.Content>
      </Panel.Content>
    </Panel.Root>
  );
};
