//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { Outliner } from './Outliner';
import { type OutlineType } from '../types';

export type OutlinerContainerProps = {
  role: string;
  outline: OutlineType;
};

export const OutlinerContainer = ({ role, outline }: OutlinerContainerProps) => {
  return (
    <StackItem.Content role={role} classNames='container-max-width'>
      <Outliner id={outline.content.target!.id} text={outline.content.target!} />
    </StackItem.Content>
  );
};

export default OutlinerContainer;
