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
          controller.setScale((scale) => scale * 1.1);
          break;
        }
        case 'zoom-out': {
          controller.setScale((scale) => scale * 0.9);
          break;
        }
      }
    },
    [controller],
  );
};
