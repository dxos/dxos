//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Next } from '@dxos/react-ui/next';

import { ErrorIndicator } from './ErrorIndicator.tsx';
import { NetworkIndicator } from './NetworkIndicator.tsx';

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
      <Next.Button
        icon='ph--chart-bar--regular'
        iconOnly
        label='Toggle stats'
        onClick={() => onShowStats?.(!showStats)}
        variant='ghost'
      />
      {flushing && (
        <Next.Button
          classNames='animate-spin'
          icon='ph--arrows-clockwise--regular'
          iconOnly
          label='Syncing'
          variant='ghost'
        />
      )}
      <Next.Button variant='ghost'>
        <NetworkIndicator />
      </Next.Button>
      <Next.Button variant='ghost'>
        <ErrorIndicator />
      </Next.Button>
    </div>
  );
};
