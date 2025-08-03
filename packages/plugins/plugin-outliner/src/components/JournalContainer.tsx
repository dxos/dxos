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
    <StackItem.Content classNames='container-max-width'>
      <Journal journal={journal} />
    </StackItem.Content>
  );
};

export default JournalContainer;
