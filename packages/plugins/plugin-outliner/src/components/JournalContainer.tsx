//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { StackItem } from '@dxos/react-ui-stack';

import { type Journal } from '../types';

import { JournalComponent } from './Journal';

export const JournalContainer = ({ object }: SurfaceComponentProps<Journal.Journal>) => {
  return (
    <StackItem.Content>
      <JournalComponent journal={object} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default JournalContainer;
