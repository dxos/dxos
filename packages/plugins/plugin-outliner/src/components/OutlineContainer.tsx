//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Layout } from '@dxos/react-ui';

import { type Outline as OutlineType } from '../types';

import { Outline } from './Outline';

export const OutlinerContainer = ({ role, subject: outline }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <Layout.Main role={role}>
      <Outline id={outline.content.target.id} text={outline.content.target} classNames='container-max-width' />
    </Layout.Main>
  );
};

export default OutlinerContainer;
