//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { Journal } from './Journal';
import { type JournalType } from '../types';

export type JournalContainerProps = {
  role: string;
  journal: JournalType;
};

export const JournalContainer = ({ role, journal }: JournalContainerProps) => {
  return (
    <StackItem.Content classNames='container-max-width'>
      <Journal journal={journal} />
    </StackItem.Content>
  );
};

export default JournalContainer;
