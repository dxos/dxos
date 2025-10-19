//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { type OutlineType } from '../types';

import { Outliner } from './Outliner';

export type OutlinerContainerProps = {
  role: string;
  outline: OutlineType;
};

export const OutlinerContainer = ({ outline }: OutlinerContainerProps) => {
  if (!outline.content.target) {
    return null;
  }

  return (
    <StackItem.Content>
      <Outliner id={outline.content.target.id} text={outline.content.target} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
