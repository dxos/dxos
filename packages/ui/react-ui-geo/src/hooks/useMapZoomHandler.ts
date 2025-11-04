//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { type ControlProps, type MapController } from '../components';

export const useMapZoomHandler = (controller: MapController | null | undefined): ControlProps['onAction'] =>
  useCallback<ControlProps['onAction']>(
    (event) => {
      if (!controller) {
        return;
      }

      switch (event) {
        case 'zoom-in': {
          controller.setZoom((scale) => scale + 1);
          break;
        }
        case 'zoom-out': {
          controller.setZoom((scale) => scale - 1);
          break;
        }
      }
    },
    [controller],
  );
