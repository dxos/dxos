//
// Copyright 2023 DXOS.org
//

import { useCallback, useState } from 'react';

import { useViewportResize } from '@dxos/react-hooks';

export const useVisualViewport = (deps?: Parameters<typeof useViewportResize>[1]) => {
  const [width, setWidth] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  const handleResize = useCallback(() => {
    if (window.visualViewport) {
      setWidth(window.visualViewport.width);
      setHeight(window.visualViewport.height);
    }
  }, []);

  useViewportResize(handleResize, deps);

  return { width, height };
};
