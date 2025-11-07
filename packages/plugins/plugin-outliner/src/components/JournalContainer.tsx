//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { type Journal } from '../types';

import { JournalComponent } from './Journal';

export type JournalContainerProps = {
  role: string;
  journal: Journal.Journal;
};

export const JournalContainer = ({ journal }: JournalContainerProps) => {
  return (
    <StackItem.Content>
      <JournalComponent journal={journal} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default JournalContainer;
