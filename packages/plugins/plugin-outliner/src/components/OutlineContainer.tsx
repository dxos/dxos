//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { StackItem } from '@dxos/react-ui-stack';

import { type Outline as OutlineType } from '../types';

import { Outline } from './Outline';

export const OutlinerContainer = ({ subject: outline }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <StackItem.Content>
      <Outline id={outline.content.target.id} text={outline.content.target} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
