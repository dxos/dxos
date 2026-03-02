//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Container } from '@dxos/react-ui';

import { Outline } from '../../components/Outline';
import { type Outline as OutlineType } from '../../types';

export const OutlineContainer = ({ role, subject: outline }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <Container.Main role={role}>
      <Outline id={outline.content.target.id} text={outline.content.target} classNames='dx-container-max-width' />
    </Container.Main>
  );
};
