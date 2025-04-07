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

const JournalContainer = ({ role, journal }: { role: string; journal: JournalType }) => {
  const space = getSpace(journal);
  const handlers = useOutlinerHandlers(space);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content role={role} toolbar={false} classNames='container-max-width'>
      <Journal.Root classNames={mx(attentionSurface, 'pbs-2')} journal={journal} {...handlers} />
    </StackItem.Content>
  );
};

export default JournalContainer;
