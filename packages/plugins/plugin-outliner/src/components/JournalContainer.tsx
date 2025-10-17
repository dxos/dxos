//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { type JournalType } from '../types';

import { Journal } from './Journal';

export type JournalContainerProps = {
  role: string;
  journal: JournalType;
};

export const JournalContainer = ({ journal }: JournalContainerProps) => {
  return (
    <StackItem.Content>
      <Journal journal={journal} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default JournalContainer;
