//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type ControlProps, type GlobeController } from '../components';

export const useGlobeZoomHandler = (controller: GlobeController | null | undefined): ControlProps['onAction'] => {
  return useCallback<ControlProps['onAction']>(
    (event) => {
      if (!controller) {
        return;
      }

      switch (event) {
        case 'zoom-in': {
          controller.setZoom((zoom) => zoom * 1.1);
          break;
        }
        case 'zoom-out': {
          controller.setZoom((zoom) => zoom * 0.9);
          break;
        }
      }
    },
    [controller],
  );
};
