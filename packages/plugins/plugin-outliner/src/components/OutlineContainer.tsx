//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { StackItem } from '@dxos/react-ui-stack';

import { type Outline as OutlineType } from '../types';

import { Outline } from './Outline';

export const OutlinerContainer = ({ subject }: SurfaceComponentProps<OutlineType.Outline>) => {
  if (!subject.content.target) {
    return null;
  }

  return (
    <StackItem.Content>
      <Outline id={subject.content.target.id} text={subject.content.target} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
