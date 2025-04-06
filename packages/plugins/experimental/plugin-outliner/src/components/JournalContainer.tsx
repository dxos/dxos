//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { attentionSurface, mx } from '@dxos/react-ui-theme';

import { Journal } from './Journal';
import { useOutlinerHandlers } from '../hooks';
import { type JournalType } from '../types';

const JournalContainer = ({ journal, role }: { journal: JournalType; role: string }) => {
  const space = getSpace(journal);
  const handlers = useOutlinerHandlers(space);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <Journal.Root classNames={mx(attentionSurface, 'p-1.5')} journal={journal} {...handlers} />
    </StackItem.Content>
  );
};

export default JournalContainer;
