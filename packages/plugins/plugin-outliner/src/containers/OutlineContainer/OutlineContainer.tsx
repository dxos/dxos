//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { Outline } from '../../components/Outline';
import { type Outline as OutlineType } from '../../types';

export const OutlineContainer = ({ role, subject: outline }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <Panel.Root role={role} className='dx-article'>
      <Panel.Content asChild>
        <Outline id={outline.content.target.id} text={outline.content.target} />
      </Panel.Content>
    </Panel.Root>
  );
};
