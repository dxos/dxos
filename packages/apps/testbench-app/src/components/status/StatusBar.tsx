//
// Copyright 2024 DXOS.org
//

import { ArrowsClockwise, ChartBar } from '@phosphor-icons/react';
import React from 'react';

import { Button } from '@dxos/react-ui';

import { ErrorIndicator } from './ErrorIndicator';
import { NetworkIndicator } from './NetworkIndicator';

/**
 * @startuml
 *
 * [*] --> State1
 * State1 --> [*]
 * State1 : this is a string
 * State1 : this is another string
 *
 * State1 -> State2
 * State2 --> [*]
 *
 * @enduml
 */
export type StatusBarProps = {
  flushing?: boolean;
  showStats?: boolean;
  onShowStats?: (show: boolean) => void;
};

// TODO(burdon): Toggle network.
export const StatusBar = ({ flushing, showStats, onShowStats }: StatusBarProps) => {
  return (
    <div className='flex items-center'>
      <Button variant='ghost' onClick={() => onShowStats?.(!showStats)}>
        <ChartBar />
      </Button>
      {flushing && (
        <Button variant='ghost'>
          <ArrowsClockwise className='animate-spin' />
        </Button>
      )}
      <Button variant='ghost'>
        <NetworkIndicator />
      </Button>
      <Button variant='ghost'>
        <ErrorIndicator />
      </Button>
    </div>
  );
};
