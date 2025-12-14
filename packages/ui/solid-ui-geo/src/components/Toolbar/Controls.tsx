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
    <div class={`flex flex-col gap-2 ${props.class ?? ''}`}>
      <button
        class="w-10 h-10 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
        onClick={() => props.onAction?.('zoom-in')}
        title="Zoom in"
      >
        <span class="text-xl">+</span>
      </button>
      <button
        class="w-10 h-10 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
        onClick={() => props.onAction?.('zoom-out')}
        title="Zoom out"
      >
        <span class="text-xl">−</span>
      </button>
    </div>
  );
};

export const ActionControls = (props: ControlProps): JSX.Element => {
  return (
    <div class={`flex flex-col gap-2 ${props.class ?? ''}`}>
      <button
        class="w-10 h-10 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
        onClick={() => props.onAction?.('start')}
        title="Start"
      >
        <span class="text-xl">▶</span>
      </button>
      <button
        class="w-10 h-10 bg-white dark:bg-gray-800 rounded shadow hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center"
        onClick={() => props.onAction?.('toggle')}
        title="Toggle"
      >
        <span class="text-xl">🌍</span>
      </button>
    </div>
  );
};
