//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type ControlProps, type GlobeController } from '../components';

const ZOOM_FACTOR = 0.1;

export const useGlobeZoomHandler = (controller: GlobeController | null | undefined): ControlProps['onAction'] =>
  useCallback<ControlProps['onAction']>(
    (event) => {
      if (!controller) {
        return;
      }

      switch (event) {
        case 'zoom-in': {
          controller.setZoom((zoom) => zoom * (1 + ZOOM_FACTOR));
          break;
        }
        case 'zoom-out': {
          controller.setZoom((zoom) => zoom * (1 - ZOOM_FACTOR));
          break;
        }
      }
    },
    [controller],
  );
