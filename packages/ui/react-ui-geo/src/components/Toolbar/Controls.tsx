//
// Copyright 2025 DXOS.org
//

import { type ControlPosition } from 'leaflet';
import React from 'react';

import { IconButton, type ThemedClassName, Toolbar } from '@dxos/react-ui';

export type ControlAction = 'toggle' | 'start' | 'zoom-in' | 'zoom-out';

export type ControlProps = ThemedClassName<{
  onAction?: (action: ControlAction) => void;
}>;

export const controlPositions: Record<ControlPosition, string> = {
  topleft: 'top-2 left-2',
  topright: 'top-2 right-2',
  bottomleft: 'bottom-2 left-2',
  bottomright: 'bottom-2 right-2',
};

export const ZoomControls = ({ classNames, onAction }: ControlProps) => {
  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <IconButton
        icon='ph--plus--regular'
        label='zoom in'
        iconOnly
        classNames='px-0 aspect-square'
        onClick={() => onAction?.('zoom-in')}
      />
      <IconButton
        icon='ph--minus--regular'
        label='zoom out'
        iconOnly
        classNames='px-0 aspect-square'
        onClick={() => onAction?.('zoom-out')}
      />
    </Toolbar.Root>
  );
};

export const ActionControls = ({ classNames, onAction }: ControlProps) => {
  return (
    <Toolbar.Root classNames={['gap-2', classNames]}>
      <IconButton
        icon='ph--play--regular'
        label='start'
        iconOnly
        classNames='px-0 aspect-square'
        onClick={() => onAction?.('start')}
      />
      <IconButton
        icon='ph--globe-hemisphere-west--regular'
        label='toggle'
        iconOnly
        classNames='px-0 aspect-square'
        onClick={() => onAction?.('toggle')}
      />
    </Toolbar.Root>
  );
};
