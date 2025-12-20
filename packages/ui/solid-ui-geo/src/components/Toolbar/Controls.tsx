//
// Copyright 2025 DXOS.org
//

import { type ControlPosition } from 'leaflet';
import { type JSX } from 'solid-js';

export type ControlAction = 'toggle' | 'start' | 'zoom-in' | 'zoom-out';

export type ControlProps = {
  class?: string;
  onAction?: (action: ControlAction) => void;
};

export const controlPositions: Record<ControlPosition, string> = {
  topleft: 'top-2 left-2',
  topright: 'top-2 right-2',
  bottomleft: 'bottom-2 left-2',
  bottomright: 'bottom-2 right-2',
};

export const ZoomControls = (props: ControlProps): JSX.Element => {
  return (
    <div class={`flex flex-row gap-2 ${props.class ?? ''}`}>
      <button
        type='button'
        class='dx-button dx-focus-ring w-10 h-10 min-bs-[2.5rem] pli-3 rounded-sm flex items-center justify-center'
        onClick={() => props.onAction?.('zoom-in')}
        title='Zoom in'
      >
        <span class='text-xl'>+</span>
      </button>
      <button
        type='button'
        class='dx-button dx-focus-ring w-10 h-10 min-bs-[2.5rem] pli-3 rounded-sm flex items-center justify-center'
        onClick={() => props.onAction?.('zoom-out')}
        title='Zoom out'
      >
        <span class='text-xl'>−</span>
      </button>
    </div>
  );
};

export const ActionControls = (props: ControlProps): JSX.Element => {
  return (
    <div class={`flex flex-row gap-2 ${props.class ?? ''}`}>
      <button
        type='button'
        class='dx-button dx-focus-ring w-10 h-10 min-bs-[2.5rem] pli-3 rounded-sm flex items-center justify-center'
        onClick={() => props.onAction?.('start')}
        title='Start'
      >
        <span class='text-xl'>▶</span>
      </button>
      <button
        type='button'
        class='dx-button dx-focus-ring w-10 h-10 min-bs-[2.5rem] pli-3 rounded-sm flex items-center justify-center'
        onClick={() => props.onAction?.('toggle')}
        title='Toggle'
      >
        <span class='text-xl'>🌍</span>
      </button>
    </div>
  );
};
