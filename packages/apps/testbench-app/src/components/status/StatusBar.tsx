//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Button, IconButton } from '@dxos/react-ui';

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
export const StatusBar = ({ flushing, showStats, onShowStats }: StatusBarProps) => (
  <div className='flex items-center'>
    <IconButton
      icon='ph--chart-bar--regular'
      iconOnly
      label='Toggle stats'
      onClick={() => onShowStats?.(!showStats)}
      variant='ghost'
    />
    {flushing && (
      <IconButton
        classNames='animate-spin'
        icon='ph--arrows-clockwise--regular'
        iconOnly
        label='Syncing'
        variant='ghost'
      />
    )}
    <Button variant='ghost'>
      <NetworkIndicator />
    </Button>
    <Button variant='ghost'>
      <ErrorIndicator />
    </Button>
  </div>
);
