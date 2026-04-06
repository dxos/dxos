//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { Panel } from '@dxos/react-ui';

import { Outline } from '../../components';
import { type Outline as OutlineType } from '../../types';

export const OutlineContainer = ({ role, subject: outline }: ObjectSurfaceProps<OutlineType.Outline>) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <Outline.Root id={outline.content.target.id} text={outline.content.target}>
      <Panel.Root role={role} className='dx-document'>
        <Panel.Content asChild>
          <Outline.Content />
        </Panel.Content>
      </Panel.Root>
    </Outline.Root>
  );
};
