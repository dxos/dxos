//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { Obj } from '@dxos/echo';
import { Panel } from '@dxos/react-ui';

export type TemplatePanelProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

export const TemplatePanel = ({ role, subject: object, attendableId: _attendableId }: TemplatePanelProps) => {
  return (
    <Panel.Root role={role} width='document'>
      <Panel.Body>
        <span>{Obj.getURI(object)}</span>
      </Panel.Body>
    </Panel.Root>
  );
};
