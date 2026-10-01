//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Next } from '@dxos/react-ui/next';

export type TemplatePanelProps = AppSurface.ObjectArticleProps<Obj.Unknown>;

export const TemplatePanel = ({ role, subject: object, attendableId: _attendableId }: TemplatePanelProps) => {
  return (
    <Next.Panel.Root role={role} width='document'>
      <Next.Panel.Body>
        <span>{Obj.getURI(object)}</span>
      </Next.Panel.Body>
    </Next.Panel.Root>
  );
};
