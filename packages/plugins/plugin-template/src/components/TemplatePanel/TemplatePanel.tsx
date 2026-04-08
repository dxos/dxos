//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

export type TemplatePanelProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

export const TemplatePanel = ({ role, subject: object, attendableId: _attendableId }: TemplatePanelProps) => {
  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Content>
        <span>{Obj.getDXN(object).toString()}</span>
      </Panel.Content>
    </Panel.Root>
  );
};
