//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

export type TemplatePanelProps = ObjectSurfaceProps<Obj.Unknown>;

export const TemplatePanel = ({ role, subject: object }: TemplatePanelProps) => {
  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content>
        <span>{Obj.getDXN(object).toString()}</span>
      </Panel.Content>
    </Panel.Root>
  );
};
