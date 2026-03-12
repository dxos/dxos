//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

export type TemplatePanelProps = SurfaceComponentProps<Obj.Unknown>;

export const TemplatePanel = ({ role, subject: object }: TemplatePanelProps) => {
  return (
    <Panel.Root role={role} className='dx-article'>
      <Panel.Content>
        <span>{Obj.getDXN(object).toString()}</span>
      </Panel.Content>
    </Panel.Root>
  );
};
