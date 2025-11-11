//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { StackItem } from '@dxos/react-ui-stack';

import { type Outline as OutlineType } from '../types';

import { Outline } from './Outline';

export const OutlinerContainer = ({ object }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!object.content.target) {
    return null;
  }

  return (
    <StackItem.Content>
      <Outline id={object.content.target.id} text={object.content.target} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
