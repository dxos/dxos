//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { StackItem } from '@dxos/react-ui-stack';

import { CallContainer } from './CallContainer';
import { type MeetingType } from '../types';

export const MeetingContainer = ({ meeting }: { meeting: MeetingType }) => {
  return (
    <StackItem.Content toolbar={false} classNames='relative'>
      <CallContainer meeting={meeting} />
    </StackItem.Content>
  );
};

export default MeetingContainer;
